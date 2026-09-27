import { useGameStore } from './gameStore';
import { useTownStore } from './townStore';
import { useInventoryStore } from './inventoryStore';
import { useQuestStore } from './questStore';
import { useKernelStore } from './kernelStore';
import { CommandKernel } from '@/gateway/kernel/commandKernel';
import {
  createSavePort,
  parseSaveFile,
} from '@/gateway/kernel/saveManager';
import { registerRecruitHeroCommand } from '@/gateway/kernel/commands';
import { setGameCommandRunner } from '@/gateway/kernel/runtimeBridge';
import { getActiveSlot, slotKey, slotBackupKey, setActiveSlot, type SaveSlotId } from '@/db/saveSlots';
import type {
  CommandEnvelope,
  FormalState,
  KernelResult,
} from '@/gateway/kernel/contracts';

const CONTENT_PACK_ID = 'darkest-dungeon-app';
const CONTENT_VERSION = '0.1.0';
const SAVE_ID = 'dd-campaign-1';

let kernel: CommandKernel | null = null;
let savePort: ReturnType<typeof createSavePort> | null = null;
let activeSlot: SaveSlotId = getActiveSlot();

function captureFormalState(): FormalState {
  const game = useGameStore.getState();
  const town = useTownStore.getState();
  const inventory = useInventoryStore.getState();
  const quest = useQuestStore.getState();

  return {
    game: {
      week: game.week,
      phase: game.phase,
      gold: game.gold,
      heirlooms: { ...game.heirlooms },
      questsFinished: game.questsFinished,
      highestDungeonLevel: game.highestDungeonLevel,
      roster: game.roster,
      selectedHeroUid: game.selectedHeroUid,
    },
    town: {
      stagecoachHeroes: town.stagecoachHeroes,
      nomadWagonTrinkets: town.nomadWagonTrinkets,
      nomadWagonProvisions: town.nomadWagonProvisions,
      buildingData: town.buildingData,
    },
    inventory: {
      trinketInventory: inventory.trinketInventory,
      provisionInventory: inventory.provisionInventory,
    },
    quest: {
      availableQuests: quest.availableQuests,
      activeQuest: quest.activeQuest,
      lastRefreshWeek: quest.lastRefreshWeek,
      rewardLog: quest.rewardLog,
    },
  };
}

function applyFormalState(state: FormalState): void {
  useGameStore.setState({ ...state.game });
  useTownStore.setState({
    ...state.town,
    activeBuilding: null,
    showDistricts: false,
  });
  useInventoryStore.setState({ ...state.inventory });
  useQuestStore.setState({ ...state.quest });
}

function createRunner() {
  if (!kernel) return null;

  return {
    getRevision: () => kernel!.getRevision(),
    execute: (envelope: CommandEnvelope): KernelResult => {
      const result = kernel!.executeCommand(envelope);
      const current = useKernelStore.getState();

      useKernelStore.setState({
        revision: kernel!.getRevision(),
        commandCount:
          result.status === 'committed'
            ? current.commandCount + 1
            : current.commandCount,
        saveStatus:
          result.status === 'committed'
            ? 'saved'
            : result.status === 'error'
              ? 'save_failed'
              : current.saveStatus,
        saveAck: result.saveAck ?? current.saveAck,
        lastTrace: result,
        lastReceipt: result.receipt ?? current.lastReceipt,
        message:
          result.status === 'committed'
            ? `已提交 ${result.receipt?.commandId}`
            : result.reason ?? null,
      });

      return result;
    },
  };
}

function buildSavePort(slot: SaveSlotId) {
  return createSavePort(window.localStorage, {
    saveKey: slotKey(slot),
    backupKey: slotBackupKey(slot),
    contentPackId: CONTENT_PACK_ID,
    contentVersion: CONTENT_VERSION,
  });
}

function bootKernel(): void {
  if (!savePort) return;

  kernel = new CommandKernel(
    { capture: captureFormalState, apply: applyFormalState },
    savePort,
    SAVE_ID
  );
  registerRecruitHeroCommand(kernel);

  const load = savePort.read();
  if (load.status === 'ok' || load.status === 'backup_restored') {
    kernel.restore(load.file!);
    useKernelStore.setState({
      revision: kernel.getRevision(),
      commandCount: kernel.getReceipts().length,
      saveStatus: load.status === 'backup_restored' ? 'backup_restored' : 'loaded',
      saveAck: 'read-ack',
      canWrite: true,
      message:
        load.status === 'backup_restored'
          ? '主档无法验证，已从备份恢复'
          : `已读档 revision ${kernel.getRevision()}`,
    });
  } else if (load.status === 'missing') {
    const state = captureFormalState();
    const file = savePort.build(state, 0, [], SAVE_ID);
    const write = savePort.write(file, 0);
    useKernelStore.setState({
      revision: 0,
      saveStatus: write.ok ? 'initialized' : 'save_failed',
      saveAck: write.ok ? write.ack : null,
      canWrite: write.ok,
      message: write.ok ? '已创建初始存档' : `初始存档失败：${write.reason}`,
    });
  } else {
    useKernelStore.setState({
      saveStatus: 'corrupt',
      canWrite: false,
      message: load.error ?? '主档与备份均无法验证，已暂停写入',
    });
  }

  setGameCommandRunner(createRunner());
}

export function bootstrapKernel(): void {
  if (kernel) return;
  savePort = buildSavePort(activeSlot);
  bootKernel();
}

// 切换存档槽位（先保存当前，再载入目标槽位）
export function switchSaveSlot(slot: SaveSlotId): { ok: boolean; message: string } {
  if (slot === activeSlot) return { ok: true, message: `已在${slot}` };
  if (kernel && savePort) {
    const file = savePort.build(
      captureFormalState(),
      kernel.getRevision(),
      kernel.getReceipts(),
      SAVE_ID
    );
    savePort.write(file, kernel.getRevision());
  }
  activeSlot = slot;
  setActiveSlot(slot);
  kernel = null;
  savePort = buildSavePort(slot);
  bootKernel();
  useKernelStore.setState({
    message: `已切换至${slot === 'slot1' ? '槽位 I' : slot === 'slot2' ? '槽位 II' : '槽位 III'}`,
    lastTrace: null,
  });
  return { ok: true, message: useKernelStore.getState().message ?? '已切换槽位' };
}

export function getCurrentSlot(): SaveSlotId {
  return activeSlot;
}

export function saveSnapshotNow(): boolean {
  if (!kernel || !savePort) return false;
  const file = savePort.build(
    captureFormalState(),
    kernel.getRevision(),
    kernel.getReceipts(),
    SAVE_ID
  );
  const result = savePort.write(file, kernel.getRevision());
  useKernelStore.setState({
    saveStatus: result.ok ? 'saved' : 'save_failed',
    saveAck: result.ok ? result.ack : null,
    canWrite: result.ok,
    message: result.ok
      ? `手动保存成功（revision ${kernel.getRevision()}）`
      : `保存失败：${result.reason}`,
  });
  return result.ok;
}

export function loadFromDisk(): boolean {
  if (!kernel || !savePort) return false;
  const result = savePort.read();
  if (result.status === 'ok' || result.status === 'backup_restored') {
    kernel.restore(result.file!);
    useKernelStore.setState({
      revision: kernel.getRevision(),
      commandCount: kernel.getReceipts().length,
      saveStatus: result.status === 'backup_restored' ? 'backup_restored' : 'loaded',
      saveAck: 'read-ack',
      canWrite: true,
      message:
        result.status === 'backup_restored'
          ? '主档无法验证，已从备份恢复'
          : `已读档 revision ${kernel.getRevision()}`,
      lastTrace: null,
    });
    return true;
  }

  useKernelStore.setState({
    saveStatus: 'load_failed',
    canWrite: result.status !== 'corrupt',
    message: result.error ?? '读档失败',
  });
  return false;
}

export function exportSaveFile(): string | null {
  if (!kernel || !savePort) return null;
  const file = savePort.build(
    captureFormalState(),
    kernel.getRevision(),
    kernel.getReceipts(),
    SAVE_ID
  );
  return JSON.stringify(file, null, 2);
}

export function importSaveFile(
  text: string
): { ok: boolean; message: string } {
  if (!kernel || !savePort) {
    return { ok: false, message: 'Kernel 未启动' };
  }

  const parsed = parseSaveFile(text);
  if (!parsed.ok) return { ok: false, message: parsed.reason };
  if (parsed.file.contentPackId !== CONTENT_PACK_ID) {
    return { ok: false, message: '存档内容包不匹配' };
  }

  kernel.restore(parsed.file);
  useKernelStore.setState({
    revision: kernel.getRevision(),
    commandCount: kernel.getReceipts().length,
    saveStatus: 'loaded',
    saveAck: 'read-ack',
    canWrite: true,
    message: `已导入 revision ${kernel.getRevision()}`,
    lastTrace: null,
  });
  return { ok: true, message: `已导入 revision ${kernel.getRevision()}` };
}
