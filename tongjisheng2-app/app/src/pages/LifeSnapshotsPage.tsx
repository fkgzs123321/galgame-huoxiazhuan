import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, Modal } from '@ui/base';
import {
  achievementEngine,
  type PlaythroughRecord,
  type NgPlusState,
  type AchievementUnlockRecord,
} from '@runtime/achievement-engine';
import { ACHIEVEMENTS, RARITY_COLOR, RARITY_LABEL, TYPE_LABEL, TYPE_ICON } from '@content/achievements/achievement-data';

/**
 * LifeSnapshotsPage · 人生快照页(路由级)
 * 对齐 fanren-remake 的 LifeSnapshotsPage + SummaryOverviewPage:
 *  - 周目回顾:每个完成周目的结局/天数/回合/继承点数
 *  - 成就总览:累计解锁统计 + NG+ 继承状态
 *  - 结局摘要分享(复制)
 */

const ENDING_EMOJI: Record<string, string> = {
  true_end: '🌟',
  good_end: '💖',
  normal_end: '🌤',
  bad_end: '🌧',
  hidden: '🔮',
};

export function LifeSnapshotsPage() {
  const navigate = useNavigate();
  const [playthroughs, setPlaythroughs] = useState<PlaythroughRecord[]>([]);
  const [ngPlus, setNgPlus] = useState<NgPlusState | null>(null);
  const [unlocks, setUnlocks] = useState<Record<string, AchievementUnlockRecord>>({});
  const [detail, setDetail] = useState<PlaythroughRecord | null>(null);

  useEffect(() => {
    void achievementEngine.load();
    setPlaythroughs(achievementEngine.getPlaythroughs());
    setNgPlus(achievementEngine.getNgPlusState());
    setUnlocks(achievementEngine.getState().unlocks);
  }, []);

  const unlockedCount = Object.keys(unlocks).length;
  const totalAchievements = ACHIEVEMENTS.length;

  const handleShare = async (p: PlaythroughRecord) => {
    const text = [
      `🌸 同级生2 周目回顾 #${p.index}`,
      `结局:${ENDING_EMOJI[p.endingType] ?? ''} ${p.endingTitle}(${p.endingType})`,
      `天数:第 ${p.dayInGame} 天 · 回合 ${p.turnCount}`,
      `身份:${p.identityName} · 玩家 ${p.playerName}`,
      `本周目成就:${p.unlockedAchievements.length} 个 · 继承点 +${p.earnedInheritPoints}`,
      p.finalStats
        ? `终局属性:${Object.entries(p.finalStats).map(([k, v]) => `${k}${v}`).join(' ')}`
        : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('周目回顾已复制到剪贴板 📋');
    } catch {
      alert(text);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            📸 人生快照
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            周目回顾 · 成就总览 · NG+ 继承
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← 返回
        </Button>
      </div>

      {/* 成就/NG+ 总览 */}
      <Card>
        <div style={{ padding: '14px 18px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>成就解锁</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-primary)' }}>
              {unlockedCount}<span style={{ fontSize: 13, color: 'var(--c-text-muted)', fontWeight: 400 }}>/{totalAchievements}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>完成周目</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-text)' }}>{playthroughs.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>当前周目</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-text)' }}>
              #{ngPlus?.currentPlaythrough ?? 1}
              {ngPlus?.activated && <Badge variant="success" style={{ marginLeft: 8, fontSize: 10 }}>NG+</Badge>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>可用继承点</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-accent)' }}>{ngPlus?.availablePoints ?? 0}</div>
          </div>
          {ngPlus && ngPlus.unlockedFlags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 320 }}>
              {ngPlus.unlockedFlags.map((f) => (
                <Badge key={f} variant="info" style={{ fontSize: 10 }}>🏷 {f}</Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 周目列表 */}
      <Card>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)' }}>周目回顾({playthroughs.length})</h3>
        </div>
        <div style={{ padding: '8px 18px 14px' }}>
          {playthroughs.length === 0 ? (
            <EmptyState icon="📸" title="暂无周目记录" description="完成一个结局后,这里会展示你的人生快照" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...playthroughs].reverse().map((p) => (
                <div
                  key={p.index}
                  onClick={() => setDetail(p)}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--c-bg)',
                    border: '1px solid var(--c-border-soft)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-soft)')}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15 }}>{ENDING_EMOJI[p.endingType] ?? '🎴'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{p.endingTitle}</span>
                    <Badge variant={p.endingType === 'true_end' ? 'success' : p.endingType === 'bad_end' ? 'danger' : 'info'}>
                      {p.endingType}
                    </Badge>
                    <Badge variant="muted">周目 #{p.index}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--c-text-muted)', marginLeft: 'auto' }}>
                      第 {p.dayInGame} 天 · {p.turnCount} 回合 · +{p.earnedInheritPoints} 继承点
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 5 }}>
                    {p.identityName} · 成就 {p.unlockedAchievements.length} 个
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 周目详情对话框 */}
      <PlaythroughDetailDialog
        open={!!detail}
        record={detail}
        onClose={() => setDetail(null)}
        onShare={handleShare}
        unlockRecords={unlocks}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  周目详情
// ───────────────────────────────────────────────────────────

function PlaythroughDetailDialog({
  open,
  record,
  onClose,
  onShare,
  unlockRecords,
}: {
  open: boolean;
  record: PlaythroughRecord | null;
  onClose: () => void;
  onShare: (p: PlaythroughRecord) => void;
  unlockRecords: Record<string, AchievementUnlockRecord>;
}) {
  if (!record) return null;
  const achList = record.unlockedAchievements
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is (typeof ACHIEVEMENTS)[number] => !!a);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`周目回顾 #${record.index} · ${record.endingTitle}`}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => onShare(record)}>
            📋 分享回顾
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge variant={record.endingType === 'true_end' ? 'success' : record.endingType === 'bad_end' ? 'danger' : 'info'}>
            {ENDING_EMOJI[record.endingType]} {record.endingType}
          </Badge>
          <Badge variant="muted">第 {record.dayInGame} 天 · {record.turnCount} 回合</Badge>
          <Badge variant="muted">+{record.earnedInheritPoints} 继承点</Badge>
        </div>

        <div style={{ fontSize: 12, color: 'var(--c-text-muted)', lineHeight: 1.7 }}>
          玩家 {record.playerName} · 身份 {record.identityName}
          <br />
          开始 {new Date(record.startedAt).toLocaleString('zh-CN')} · 结束 {new Date(record.endedAt).toLocaleString('zh-CN')}
        </div>

        {record.finalStats && (
          <div style={{ padding: 10, background: 'var(--c-bg)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 6 }}>终局属性</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(record.finalStats).map(([k, v]) => (
                <span key={k} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--c-overlay)', borderRadius: 6, color: 'var(--c-text)' }}>
                  {k} <strong>{v}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 6 }}>
            本周目成就({achList.length})
          </div>
          {achList.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--c-text-soft)' }}>本周目未解锁成就</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {achList.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', background: 'var(--c-bg)', borderRadius: 6, fontSize: 12 }}>
                  <span>{a.icon}</span>
                  <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>{a.title}</span>
                  <Badge variant="info" style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {RARITY_LABEL[a.rarity]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
