import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandKernel } from '../src/gateway/kernel/commandKernel.ts';
import {
  createSavePort,
  parseSaveFile,
  serializeSaveFile,
} from '../src/gateway/kernel/saveManager.ts';
import { registerRecruitHeroCommand } from '../src/gateway/kernel/commands.ts';
import type {
  CommandEnvelope,
  FormalState,
  StatePort,
  StorageLike,
} from '../src/gateway/kernel/contracts.ts';

function makeInitialState(): FormalState {
  return {
    game: {
      week: 1,
      phase: 'town',
      gold: 1500,
      heirlooms: { bust: 0, portrait: 0, deed: 0, crest: 0 },
      questsFinished: 0,
      highestDungeonLevel: 0,
      roster: [],
      selectedHeroUid: null,
    },
    town: {
      stagecoachHeroes: [
        {
          uid: 'hero_recruit_1',
          classId: 'crusader',
          name: '测试十字军',
          resolveLevel: 0,
          currentHp: 33,
          maxHp: 33,
          stress: 0,
          quirks: [],
          diseases: [],
          trinket1: null,
          trinket2: null,
          skills: [],
          campingSkills: [],
          weaponLevel: 0,
          armorLevel: 0,
          missingUntilWeek: null,
          activityLocked: false,
        },
      ],
      nomadWagonTrinkets: [],
      nomadWagonProvisions: [],
      buildingData: {},
    },
    inventory: {
      trinketInventory: [],
      provisionInventory: [],
    },
    quest: {
      availableQuests: [],
      activeQuest: null,
      lastRefreshWeek: 0,
      rewardLog: [],
    },
  };
}

function makeMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

function makeStatePort(initial: FormalState): StatePort {
  let state = structuredClone(initial);
  return {
    capture: () => structuredClone(state),
    apply: (next) => {
      state = structuredClone(next);
    },
  };
}

function makeHarness(initial = makeInitialState(), storage = makeMemoryStorage()) {
  const savePort = createSavePort(storage, {
    saveKey: 'test-save',
    backupKey: 'test-save.bak',
    contentPackId: 'darkest-dungeon-app',
    contentVersion: '0.1.0',
  });
  const statePort = makeStatePort(initial);
  const kernel = new CommandKernel(statePort, savePort, 'test-campaign');
  registerRecruitHeroCommand(kernel);
  return { storage, savePort, statePort, kernel };
}

function envelope(
  commandId: string,
  payload: unknown,
  expectedRevision: number
): CommandEnvelope {
  return {
    commandId,
    type: 'dd.recruitHero',
    payload,
    actor: 'player',
    source: 'test',
    expectedRevision,
    issuedAt: new Date().toISOString(),
  };
}

test('招募命令提交一次并在重开后恢复', () => {
  const initial = makeInitialState();
  const { savePort, statePort, kernel } = makeHarness(initial);

  const result = kernel.executeCommand(
    envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0)
  );

  assert.equal(result.status, 'committed');
  assert.equal(result.code, 'ok');
  assert.equal(result.receipt?.nextRevision, 1);
  assert.equal(result.saveAck, 'atomic-readback-ack');

  const after = statePort.capture();
  assert.equal(after.game.gold, 500);
  assert.equal(after.game.roster.length, 1);
  assert.equal(after.town.stagecoachHeroes.length, 0);

  const loaded = savePort.read();
  assert.equal(loaded.status, 'ok');
  assert.ok(loaded.file);
  assert.equal(loaded.file!.revision, 1);
  assert.equal(loaded.file!.commandReceipts.length, 1);

  const reopenStatePort = makeStatePort(initial);
  const reopenKernel = new CommandKernel(reopenStatePort, savePort, 'test-campaign');
  registerRecruitHeroCommand(reopenKernel);
  reopenKernel.restore(loaded.file!);

  const restored = reopenStatePort.capture();
  assert.equal(restored.game.gold, 500);
  assert.equal(restored.game.roster[0]?.uid, 'hero_recruit_1');
  assert.equal(reopenKernel.getRevision(), 1);
});

test('相同 commandId 与 payload 返回原收据', () => {
  const { kernel } = makeHarness();

  const first = kernel.executeCommand(
    envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0)
  );
  const second = kernel.executeCommand(
    envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0)
  );

  assert.equal(first.status, 'committed');
  assert.equal(second.status, 'already_committed');
  assert.equal(second.receipt?.commandId, first.receipt?.commandId);
  assert.equal(kernel.getRevision(), 1);
});

test('相同 commandId 携带不同 payload 是协议冲突', () => {
  const { kernel } = makeHarness();

  kernel.executeCommand(envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0));
  const conflict = kernel.executeCommand(
    envelope('cmd-1', { heroUid: 'other_hero' }, 0)
  );

  assert.equal(conflict.status, 'rejected');
  assert.equal(conflict.code, 'protocol_conflict');
});

test('金币不足时拒绝且状态不变', () => {
  const initial = makeInitialState();
  initial.game.gold = 500;
  const { statePort, kernel } = makeHarness(initial);

  const result = kernel.executeCommand(
    envelope('cmd-2', { heroUid: 'hero_recruit_1' }, 0)
  );

  assert.equal(result.status, 'rejected');
  assert.equal(result.code, 'handler_rejected');
  assert.equal(statePort.capture().game.gold, 500);
  assert.equal(kernel.getRevision(), 0);
});

test('过期 expectedRevision 被拒绝', () => {
  const { kernel } = makeHarness();

  kernel.executeCommand(envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0));
  const stale = kernel.executeCommand(
    envelope('cmd-2', { heroUid: 'hero_recruit_1' }, 0)
  );

  assert.equal(stale.status, 'rejected');
  assert.equal(stale.code, 'revision_conflict');
});

test('存档 CAS 冲突时拒绝提交且不改变状态', () => {
  const { savePort, kernel } = makeHarness();

  kernel.executeCommand(envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0));

  const freshPort = makeStatePort(makeInitialState());
  const freshKernel = new CommandKernel(freshPort, savePort, 'test-campaign');
  registerRecruitHeroCommand(freshKernel);

  const result = freshKernel.executeCommand(
    envelope('cmd-2', { heroUid: 'hero_recruit_1' }, 0)
  );

  assert.equal(result.status, 'error');
  assert.equal(result.code, 'save_failed');
  assert.equal(freshKernel.getRevision(), 0);
  assert.equal(freshPort.capture().game.gold, 1500);
});

test('主档损坏时从备份恢复并保留损坏原件', () => {
  const { storage, savePort, statePort, kernel } = makeHarness();

  kernel.executeCommand(envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0));
  // 第二次写入会把第一次存档移到备份，模拟真实备份轮换
  const snapshot = savePort.build(
    statePort.capture(),
    kernel.getRevision(),
    kernel.getReceipts(),
    'test-campaign'
  );
  const manual = savePort.write(snapshot, kernel.getRevision());
  assert.equal(manual.ok, true);

  storage.setItem('test-save', '{broken');

  const result = savePort.read();
  assert.equal(result.status, 'backup_restored');
  assert.equal(result.file?.revision, 1);
  assert.equal(result.preservedMain, '{broken');
});

test('主档与备份都损坏时进入损坏状态并保留原始数据', () => {
  const { storage, savePort } = makeHarness();
  storage.setItem('test-save', '{broken');
  storage.setItem('test-save.bak', 'also broken');

  const result = savePort.read();
  assert.equal(result.status, 'corrupt');
  assert.equal(result.file, null);
  assert.equal(result.preservedMain, '{broken');
  assert.equal(result.preservedBackup, 'also broken');
});

test('存档导出与导入往返保持校验一致', () => {
  const { savePort, statePort, kernel } = makeHarness();

  kernel.executeCommand(envelope('cmd-1', { heroUid: 'hero_recruit_1' }, 0));
  const file = savePort.build(
    statePort.capture(),
    kernel.getRevision(),
    kernel.getReceipts(),
    'test-campaign'
  );

  const text = serializeSaveFile(file);
  const parsed = parseSaveFile(text);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.file.integrity, file.integrity);
    assert.equal(parsed.file.revision, 1);
  }
});
