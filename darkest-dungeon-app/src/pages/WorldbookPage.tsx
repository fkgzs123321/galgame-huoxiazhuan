// 世界书管理页 — 条目 CRUD/注入预览/AI 生成（对齐凡人 WorldbookManagerPage）
import { useMemo, useState } from 'react';
import { Panel, PanelHeader, SectionTitle, Button, EmptyState, TextInput, Toggle } from '@/ui';
import { useWorldbookStore, type WorldbookEntry, type WbTrigger } from '@/stores/worldbookStore';
import { AppDialog } from '@/dialogs/AppDialog';
import { scheduleLore, formatLoreBlock, seedBuiltinLore } from '@/gateway/loreScheduler';
import { ConfirmDialog } from '@/dialogs/ConfirmDialog';
import { buildWorldbookGenPrompt, parseWorldbookJson } from '@/prompts/worldbookPrompt';
import { useAiStore } from '@/stores/aiStore';
import { aiChat } from '@/gateway/aiGateway';
import { toast } from '@/ui/Extras';
import { logHub } from '@/stores/logStore';

const EMPTY_FORM = { title: '', content: '', triggerType: 'keyword' as WbTrigger, keywords: '', constant: false };

export function WorldbookPage({ onBack }: { onBack?: () => void }) {
  const { entries, updateEntry, removeEntry, setEnabled, addEntry } = useWorldbookStore();
  const [editing, setEditing] = useState<WorldbookEntry | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [previewText, setPreviewText] = useState('庄园的火把熄灭了，遗迹深处的低语越来越近…');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState('');
  const [genResult, setGenResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const aiConfig = useAiStore((s) => s.config);

  const sorted = useMemo(() => [...entries].sort((a, b) => a.order - b.order), [entries]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing({ id: '__new__' } as WorldbookEntry);
  };

  const openEdit = (e: WorldbookEntry) => {
    setForm({
      title: e.title,
      content: e.content,
      triggerType: e.triggerType,
      keywords: e.keywords.join(', '),
      constant: e.constant,
    });
    setEditing(e);
  };

  const save = () => {
    if (!editing) return;
    const patch = {
      title: form.title || '未命名条目',
      content: form.content,
      triggerType: form.triggerType,
      keywords: form.keywords.split(/[,，\s]+/).filter(Boolean),
      constant: form.constant,
    };
    if (editing.id === '__new__') {
      addEntry(patch);
    } else {
      updateEntry(editing.id, patch);
    }
    setEditing(null);
  };

  const previewHits = useMemo(
    () => scheduleLore(previewText, { recordHits: false }),
    [previewText, entries]
  );

  // AI 生成条目（按输出契约解析后直接入库）
  const generateEntry = async () => {
    if (!genTopic.trim()) { toast('请先输入生成主题', 'error'); return; }
    setGenerating(true);
    setGenResult('');

    if (!aiConfig.enabled) {
      setGenResult('AI 未启用：请先在「设置 → AI 接口」配置并启用模型，或手动新建条目。');
      setGenerating(false);
      return;
    }

    try {
      const res = await aiChat(aiConfig, [
        { role: 'user', content: buildWorldbookGenPrompt(genTopic.trim()) },
      ]);
      const parsed = parseWorldbookJson(res.text);
      if (!parsed) {
        setGenResult(`返回内容不是有效 JSON 契约：\n${res.text.slice(0, 300)}`);
        logHub.error('世界书 AI 生成解析失败');
        return;
      }
      addEntry({
        title: parsed.title,
        content: parsed.content,
        triggerType: 'keyword',
        keywords: parsed.keywords,
        constant: false,
        source: 'user',
      });
      setGenResult(`✓ 已生成并入库：${parsed.title}（关键词：${parsed.keywords.join('、') || '无'}）`);
      logHub.info(`世界书 AI 生成：${parsed.title}`);
      toast('AI 条目已加入世界书', 'success');
    } catch (err) {
      setGenResult(`生成失败：${err instanceof Error ? err.message : String(err)}`);
      logHub.error(`世界书生成失败：${err instanceof Error ? err.message : String(err)}`);
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>世界书管理</SectionTitle>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => seedBuiltinLore()}>播种内置条目</Button>
          <Button variant="primary" onClick={openNew}>新建条目</Button>
          {onBack && <Button variant="ghost" onClick={onBack}>← 返回</Button>}
        </div>
      </div>

      <Panel>
        <PanelHeader title="◆ AI 生成条目" extra={aiConfig.enabled ? '契约：标题/内容/关键词' : 'AI 未启用'} />
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <TextInput
              className="flex-1"
              value={genTopic}
              onChange={setGenTopic}
              placeholder="例如：猪人之王威尔伯 / 先祖的罪孽 / 血酒与猩红诅咒…"
            />
            <Button variant="primary" onClick={() => void generateEntry()} disabled={generating}>
              {generating ? '生成中…' : '✦ 让 AI 编写条目'}
            </Button>
          </div>
          {genResult && (
            <pre className="text-xs text-dd-textMuted whitespace-pre-wrap bg-black/30 p-3 rounded border border-dd-gold/10 max-h-32 overflow-y-auto">
              {genResult}
            </pre>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 注入预览" extra={`命中 ${previewHits.length} 条`} />
        <div className="p-4 space-y-3">
          <TextInput value={previewText} onChange={setPreviewText} placeholder="输入测试文本…" />
          <pre className="text-xs text-dd-textMuted whitespace-pre-wrap bg-black/30 p-3 rounded border border-dd-gold/10 max-h-40 overflow-y-auto">
            {formatLoreBlock(previewHits) || '（无命中）'}
          </pre>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="◆ 条目列表" extra={`${sorted.length} 条`} />
        <div className="max-h-[50vh] overflow-y-auto">
          {sorted.length === 0 ? (
            <EmptyState text="暂无条目（可播种内置条目或新建）" />
          ) : (
            sorted.map((e) => (
              <div key={e.id} className="px-3 py-2 border-b border-dd-gold/5 flex items-center gap-3 text-xs">
                <Toggle checked={e.enabled} onChange={(v) => setEnabled(e.id, v)} />
                <span className="text-dd-gold font-medium truncate flex-1">{e.title}</span>
                {e.constant && <span className="text-[10px] text-sky-300 border border-sky-300/30 rounded-sm px-1">常驻</span>}
                <span className="text-[10px] text-dd-textDim">
                  {e.triggerType === 'always' ? '总是' : `${e.keywords.length} 关键词`} · 命中 {e.hitCount}
                </span>
                <span className="text-[10px] text-dd-textDim">{(e.content.length / 2).toFixed(0)} tok</span>
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>编辑</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(e.id)}>删除</Button>
              </div>
            ))
          )}
        </div>
      </Panel>

      <AppDialog
        open={editing !== null}
        title={editing?.id === '__new__' ? '新建世界书条目' : `编辑：${editing?.title ?? ''}`}
        onClose={() => setEditing(null)}
        width="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>取消</Button>
            <Button variant="primary" onClick={save}>保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dd-textDim tracking-wider block mb-1">标题</label>
            <TextInput className="w-full" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          </div>
          <div>
            <label className="text-xs text-dd-textDim tracking-wider block mb-1">内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              className="w-full bg-black/30 border border-dd-gold/25 text-sm px-2 py-1.5 outline-none focus:border-dd-gold/60"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dd-textDim tracking-wider block mb-1">触发方式</label>
              <select
                className="w-full bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 text-dd-text outline-none"
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value as WbTrigger })}
              >
                <option value="keyword">关键词</option>
                <option value="always">常驻注入</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-dd-textDim tracking-wider block mb-1">关键词（逗号分隔）</label>
              <TextInput className="w-full" value={form.keywords} onChange={(v) => setForm({ ...form, keywords: v })} disabled={form.triggerType === 'always'} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Toggle checked={form.constant} onChange={(v) => setForm({ ...form, constant: v })} label="常驻注入（不依赖关键词）" />
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="删除世界书条目"
        message="该条目将被永久删除。确定继续？"
        confirmText="删除"
        danger
        onConfirm={() => {
          if (confirmDelete) removeEntry(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
