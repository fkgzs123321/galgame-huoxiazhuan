import type {
  CommandEnvelope,
  CommandHandler,
  CommandOutcome,
  CommandReceipt,
  KernelResult,
  SaveFile,
  SavePort,
  StatePort,
} from './contracts.ts';

// 稳定序列化：键排序，保证同一命令生成相同 fingerprint
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function fingerprintEnvelope(envelope: CommandEnvelope): string {
  return stableStringify({ type: envelope.type, payload: envelope.payload });
}

export class CommandKernel {
  private revision = 0;
  private receipts = new Map<string, CommandReceipt>();
  private handlers = new Map<string, CommandHandler<unknown>>();
  private readonly statePort: StatePort;
  private readonly savePort: SavePort;
  private readonly saveId: string;

  constructor(
    statePort: StatePort,
    savePort: SavePort,
    saveId = 'dd-campaign-1'
  ) {
    this.statePort = statePort;
    this.savePort = savePort;
    this.saveId = saveId;
  }

  register<P>(type: string, handler: CommandHandler<P>): void {
    this.handlers.set(type, handler as CommandHandler<unknown>);
  }

  getRevision(): number {
    return this.revision;
  }

  getReceipts(): CommandReceipt[] {
    return [...this.receipts.values()];
  }

  restore(save: SaveFile): void {
    this.revision = save.revision;
    this.receipts = new Map(
      save.commandReceipts.map((receipt) => [receipt.commandId, receipt])
    );
    this.statePort.apply(save.state);
  }

  executeCommand(envelope: CommandEnvelope): KernelResult {
    const startedAt = Date.now();
    const durationMs = () => Date.now() - startedAt;

    const fingerprint = fingerprintEnvelope(envelope);
    const existing = this.receipts.get(envelope.commandId);

    if (existing) {
      const samePayload = existing.fingerprint === fingerprint;
      return {
        status: samePayload ? 'already_committed' : 'rejected',
        code: samePayload ? 'already_committed' : 'protocol_conflict',
        reason: samePayload
          ? undefined
          : '同一 commandId 携带了不同的 payload',
        baseRevision: existing.baseRevision,
        nextRevision: existing.nextRevision,
        receipt: existing,
        durationMs: durationMs(),
      };
    }

    if (envelope.expectedRevision !== this.revision) {
      return {
        status: 'rejected',
        code: 'revision_conflict',
        reason: `期望修订 ${envelope.expectedRevision}，当前修订 ${this.revision}`,
        baseRevision: this.revision,
        nextRevision: this.revision,
        durationMs: durationMs(),
      };
    }

    const handler = this.handlers.get(envelope.type);
    if (!handler) {
      return {
        status: 'error',
        code: 'unknown_command',
        reason: `未注册的命令类型：${envelope.type}`,
        baseRevision: this.revision,
        nextRevision: this.revision,
        durationMs: durationMs(),
      };
    }

    const snapshot = structuredClone(this.statePort.capture());
    let outcome: CommandOutcome;
    try {
      outcome = handler(
        { state: snapshot, revision: this.revision },
        envelope.payload
      );
    } catch (err) {
      return {
        status: 'error',
        code: 'unknown',
        reason: err instanceof Error ? err.message : String(err),
        baseRevision: this.revision,
        nextRevision: this.revision,
        durationMs: durationMs(),
      };
    }

    if (outcome.status === 'rejected') {
      return {
        status: 'rejected',
        code: 'handler_rejected',
        reason: outcome.reason,
        baseRevision: this.revision,
        nextRevision: this.revision,
        durationMs: durationMs(),
      };
    }

    const nextRevision = this.revision + 1;
    const receipt: CommandReceipt = {
      commandId: envelope.commandId,
      type: envelope.type,
      fingerprint,
      baseRevision: this.revision,
      nextRevision,
      status: 'committed',
      summary: outcome.summary,
      committedAt: new Date().toISOString(),
      saveId: this.saveId,
    };

    const receipts = [...this.receipts.values(), receipt];
    const file = this.savePort.build(
      outcome.nextState,
      nextRevision,
      receipts,
      this.saveId
    );
    const writeResult = this.savePort.write(file, this.revision);

    if (!writeResult.ok) {
      return {
        status: 'error',
        code: 'save_failed',
        reason: writeResult.reason,
        baseRevision: this.revision,
        nextRevision: this.revision,
        durationMs: durationMs(),
      };
    }

    this.statePort.apply(outcome.nextState);
    this.revision = nextRevision;
    this.receipts.set(envelope.commandId, receipt);

    return {
      status: 'committed',
      code: 'ok',
      baseRevision: receipt.baseRevision,
      nextRevision,
      receipt,
      summary: outcome.summary,
      saveAck: writeResult.ack,
      durationMs: durationMs(),
    };
  }
}
