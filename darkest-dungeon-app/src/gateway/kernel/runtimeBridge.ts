import type { CommandEnvelope, KernelResult } from './contracts.ts';

export interface GameCommandRunner {
  execute(envelope: CommandEnvelope): KernelResult;
  getRevision(): number;
}

let runner: GameCommandRunner | null = null;
let commandCounter = 0;

export function setGameCommandRunner(next: GameCommandRunner | null): void {
  runner = next;
}

export function createCommandId(prefix = 'cmd'): string {
  commandCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${commandCounter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function runGameCommand(
  type: string,
  payload: unknown,
  source: string
): KernelResult {
  const current = runner;
  if (!current) {
    return {
      status: 'error',
      code: 'kernel_not_ready',
      baseRevision: 0,
      nextRevision: 0,
      reason: 'Kernel 尚未启动',
      durationMs: 0,
    };
  }

  return current.execute({
    commandId: createCommandId(),
    type,
    payload,
    actor: 'player',
    source,
    expectedRevision: current.getRevision(),
    issuedAt: new Date().toISOString(),
  });
}
