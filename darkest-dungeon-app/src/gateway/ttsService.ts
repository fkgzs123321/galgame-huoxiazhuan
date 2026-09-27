// TTS 服务 — Web Speech API 朗读（正文/事件播报），带可用性探测与降级
// 对齐凡人 StoryTtsSettings

import { traceHub } from '@/utils/trace';
import { logHub } from '@/stores/logStore';

let enabled = true;
let rate = 1;
let voiceName: string | null = null;
let current: SpeechSynthesisUtterance | null = null;

export function setTtsEnabled(v: boolean): void { enabled = v; }
export function setTtsRate(v: number): void { rate = v; }
export function setTtsVoice(name: string | null): void { voiceName = name; }

export function isTtsAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!isTtsAvailable()) return [];
  return speechSynthesis.getVoices();
}

export function listZhVoices(): SpeechSynthesisVoice[] {
  return listVoices().filter((v) => v.lang.toLowerCase().startsWith('zh'));
}

// 朗读文本（自动选择中文语音）
export function speak(text: string, opts: { interrupt?: boolean } = {}): boolean {
  if (!enabled || !isTtsAvailable()) return false;
  if (!text.trim()) return false;

  const synth = speechSynthesis;
  if (opts.interrupt !== false) synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = rate;
  const zhVoices = listZhVoices();
  const picked = voiceName
    ? zhVoices.find((v) => v.name === voiceName)
    : zhVoices.find((v) => v.lang === 'zh-CN') ?? zhVoices[0];
  if (picked) utter.voice = picked;

  utter.onend = () => { current = null; };
  utter.onerror = () => { current = null; };

  current = utter;
  synth.speak(utter);
  traceHub.push('event', 'TTS 播报', { meta: { len: text.length, voice: picked?.name } });
  return true;
}

export function stopSpeaking(): void {
  if (!isTtsAvailable()) return;
  speechSynthesis.cancel();
  current = null;
}

export function isSpeaking(): boolean {
  return current !== null && isTtsAvailable() && speechSynthesis.speaking;
}

// 播报短句（事件/周报用，带兜底日志）
export function announce(text: string): void {
  const ok = speak(text);
  if (!ok) logHub.info(`[TTS 不可用] ${text.slice(0, 40)}…`);
}
