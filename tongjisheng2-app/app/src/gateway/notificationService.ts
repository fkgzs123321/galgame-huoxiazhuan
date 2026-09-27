import { useToastStore } from '@stores/index';

/**
 * notificationService · 通知/提示音服务(网关层)
 * 对齐 fanren-remake 的 service-C8dE63Ol(提示音) + notificationStore:
 *  - 全局 toast 通知(经 toastStore)
 *  - 提示音播放(Web Audio 合成,无需音频文件)
 *  - 成功/失败/信息语义化封装
 */

type SoundName = 'success' | 'error' | 'info' | 'turn';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

const SOUND_FREQS: Record<SoundName, number[]> = {
  success: [880, 1320],
  error: [220, 180],
  info: [660],
  turn: [520, 780, 1040],
};

/** 播放提示音(Web Audio 合成) */
export function playSound(name: SoundName = 'info'): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const freqs = SOUND_FREQS[name];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    });
  } catch {
    // 音频失败静默
  }
}

/** 通知服务(统一入口) */
export const notificationService = {
  success(message: string, duration?: number) {
    useToastStore.getState().success(message, duration);
    playSound('success');
  },
  error(message: string, duration?: number) {
    useToastStore.getState().error(message, duration);
    playSound('error');
  },
  info(message: string, duration?: number) {
    useToastStore.getState().info(message, duration);
    playSound('info');
  },
  warning(message: string, duration?: number) {
    useToastStore.getState().warning(message, duration);
  },
  /** 回合结束提示音(不弹 toast) */
  turn() {
    playSound('turn');
  },
};
