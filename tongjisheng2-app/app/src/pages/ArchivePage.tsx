import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, EmptyState, useToast } from '@ui/base';
import {
  exportSaveAsFile,
  exportAllSavesZip,
  importSaveFromFile,
  importAllSavesFromFile,
  getArchiveSummary,
  checkMigration,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveSummary,
} from '@gateway/index';
import { notificationService } from '@gateway/index';

/**
 * ArchivePage · 存档管理页(路由级)
 * 对齐 fanren-remake 的 ArchivePage + archiveZipTransfer:
 *  - 存档总览(数量/最新存档)
 *  - 批量导出(Worker 打包全部存档)
 *  - 批量导入(Worker 解包 + 逐个写入,含版本迁移检查)
 *  - 单档导出/删除入口说明
 */

interface SaveRow {
  hash: string;
  label: string;
  savedAt: number;
  turnCount: number;
}

export function ArchivePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [summary, setSummary] = useState<ArchiveSummary | null>(null);
  const [rows, setRows] = useState<SaveRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState<string | null>(null);

  const refresh = async () => {
    const [sum, all] = await Promise.all([getArchiveSummary(), listAllSaves()]);
    setSummary(sum);
    setRows(all);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleExportAll = async () => {
    setBusy(true);
    try {
      const r = await exportAllSavesZip();
      if (r.ok) {
        notificationService.success(`已导出全部存档(${rows.length} 个) → ${r.fileName}`);
      } else {
        notificationService.error(r.error ?? '导出失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExportOne = async (hash: string) => {
    setBusy(true);
    try {
      const r = await exportSaveAsFile(hash);
      if (r.ok) {
        notificationService.success(`已导出存档 → ${r.fileName}`);
      } else {
        notificationService.error(r.error ?? '导出失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (file: File, batch: boolean) => {
    setBusy(true);
    try {
      if (batch) {
        const r = await importAllSavesFromFile(file);
        if (r.ok) {
          notificationService.success(`已批量导入 ${r.count ?? 0} 个存档`);
          setMigrationMsg(checkMigration(ARCHIVE_SCHEMA_VERSION).needsMigration ? checkMigration(0).message : null);
        } else {
          notificationService.error(r.error ?? '批量导入失败');
        }
      } else {
        const r = await importSaveFromFile(file);
        if (r.ok) {
          notificationService.success(`已导入存档 ${r.hash?.slice(0, 8)}`);
        } else {
          notificationService.error(r.error ?? '导入失败');
        }
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--c-primary)', letterSpacing: 1 }}>
            💾 存档管理
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-muted)' }}>
            存档 schema 版本 v{ARCHIVE_SCHEMA_VERSION} · 支持批量打包/迁移
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← 返回
        </Button>
      </div>

      {/* 总览 */}
      {summary && (
        <Card>
          <CardBody>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge variant="info">共 {summary.total} 个存档</Badge>
              {summary.latest && (
                <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
                  最新:{summary.latest.label} · 第 {summary.latest.turnCount} 天 ·
                  {new Date(summary.latest.savedAt).toLocaleString('zh-CN')}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 迁移提示 */}
      {migrationMsg && (
        <div style={{ padding: 10, background: 'rgba(255,112,67,0.1)', border: '1px solid rgba(255,112,67,0.35)', borderRadius: 8, fontSize: 12, color: 'var(--c-warning)' }}>
          ⚠️ {migrationMsg}
        </div>
      )}

      {/* 批量操作 */}
      <Card>
        <CardHeader title="批量操作(Worker 打包)" />
        <CardBody>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="primary" onClick={handleExportAll} disabled={busy || rows.length === 0}>
              {busy ? '处理中…' : `📦 导出全部存档(${rows.length})`}
            </Button>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportFile(f, true);
                  e.target.value = '';
                }}
              />
              <span className="th-btn th-btn--secondary th-btn--md">📥 批量导入存档包</span>
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportFile(f, false);
                  e.target.value = '';
                }}
              />
              <span className="th-btn th-btn--ghost th-btn--md">📄 导入单个存档</span>
            </label>
            <span style={{ fontSize: 11, color: 'var(--c-text-soft)' }}>
              批量包由 Worker 线程打包/解包,含版本迁移检查
            </span>
          </div>
        </CardBody>
      </Card>

      {/* 存档列表 */}
      <Card>
        <CardHeader title={`存档列表(${rows.length})`} />
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState icon="📭" title="暂无存档" description="开始游戏后每回合会自动创建存档,也可在「存档与恢复」面板手动存档" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((row) => (
                <div
                  key={row.hash}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'var(--c-bg)',
                    border: '1px solid var(--c-border-soft)',
                    borderRadius: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--c-primary)', minWidth: 90 }}>
                    {row.hash.slice(0, 10)}…
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--c-text)', flex: 1, minWidth: 120 }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                    第 {row.turnCount} 天 · {new Date(row.savedAt).toLocaleString('zh-CN')}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => void handleExportOne(row.hash)} disabled={busy}>
                    导出
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
//  辅助(与 archiveService 共享的列表逻辑,直接复用 gateway)
// ───────────────────────────────────────────────────────────

import { openDB } from '@db/indexeddb';

async function listAllSaves(): Promise<SaveRow[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const all = (await new Promise<unknown[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as unknown[]);
      req.onerror = () => reject(req.error);
    })) as Array<{
      hash?: string;
      label?: string;
      savedAt?: number;
      turnCount?: number;
    }>;
    return all
      .map((s) => ({
        hash: s.hash ?? '',
        label: s.label ?? '未命名',
        savedAt: s.savedAt ?? 0,
        turnCount: s.turnCount ?? 0,
      }))
      .filter((s) => s.hash)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** 卡片局部组件(避免与 ui/base Card 的 header 用法冲突) */
function CardHeader({ title }: { title: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--c-border-soft)' }}>
      <h3 style={{ margin: 0, fontSize: 14, color: 'var(--c-text)', fontWeight: 500 }}>{title}</h3>
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '14px 18px' }}>{children}</div>;
}
