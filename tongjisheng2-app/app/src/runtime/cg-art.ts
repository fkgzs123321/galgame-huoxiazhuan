/**
 * CG 场景插画生成器(替代纯渐变占位)
 *
 * 职责:
 *  - 按女角/类型生成程序化 SVG 场景插画(data URI,无需外部资源)
 *  - 提供 getCgArt():优先 CGEntry.imageUrl(真实图片),兜底 SVG 插画
 *
 * 不做:
 *  - 不加载外部网络图片(由调用方保证 imageUrl 来源可信)
 */

import type { CGEntry } from './cg-gallery';

// ───────────────────────────────────────────────────────────
//  女角调色板(主色 × 辅色)
// ───────────────────────────────────────────────────────────

const HEROINE_PALETTES: Record<string, [string, string, string]> = {
  鸣泽美佐子: ['#f8bbd0', '#e91e63', '#880e4f'],
  鸣泽亚柚: ['#ffe0b2', '#ff9800', '#e65100'],
  水野樱子: ['#bbdefb', '#64b5f6', '#0d47a1'],
  美纪: ['#ce93d8', '#ab47bc', '#4a148c'],
  西寺: ['#90a4ae', '#546e7a', '#263238'],
  舞岛可怜: ['#ffccbc', '#ff7043', '#bf360c'],
  加藤美纪: ['#d1c4e9', '#9575cd', '#4527a0'],
  筱原泉美: ['#b2dfdb', '#26a69a', '#004d40'],
  南川洋子: ['#fff9c4', '#fdd835', '#f57f17'],
  都筑梢江: ['#c8e6c9', '#66bb6a', '#1b5e20'],
  水野友美: ['#b3e5fc', '#29b6f6', '#01579b'],
  安田爱美: ['#f8bbd0', '#ec407a', '#ad1457'],
  田中美沙: ['#d7ccc8', '#8d6e63', '#3e2723'],
  片桐美铃: ['#ffcdd2', '#ef5350', '#b71c1c'],
  野野村美里: ['#e1bee7', '#ba68c8', '#6a1b9a'],
  永岛久美子: ['#dcedc8', '#9ccc65', '#33691e'],
  永岛佐知子: ['#cfd8dc', '#78909c', '#37474f'],
  齐藤澪: ['#ffe0b2', '#ffa726', '#ef6c00'],
  齐藤澪奈: ['#ffccbc', '#ff8a65', '#d84315'],
  铃木美穗: ['#b2dfdb', '#4db6ac', '#00695c'],
  仁科: ['#c5cae9', '#7986cb', '#283593'],
  正树夏子: ['#f0f4c3', '#d4e157', '#827717'],
  杉本樱子: ['#fce4ec', '#f48fb1', '#c2185b'],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function paletteFor(heroineName: string): [string, string, string] {
  const p = HEROINE_PALETTES[heroineName];
  if (p) return p;
  const h = hashString(heroineName || '未知');
  const hue = h % 360;
  return [
    `hsl(${hue}, 70%, 88%)`,
    `hsl(${hue}, 75%, 62%)`,
    `hsl(${hue}, 70%, 30%)`,
  ];
}

// ───────────────────────────────────────────────────────────
//  SVG 插画生成
// ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 生成 CG 场景插画 SVG(data URI)
 *  - portrait: 人物剪影 + 花瓣
 *  - h-first / h-advanced / h-normal: 暖调场景 + 心形
 *  - event: 场景剪影(窗/信/剪影等元素)
 */
export function buildCgArtSvg(cg: Pick<CGEntry, 'type' | 'heroineName' | 'title'>): string {
  const [c1, c2, c3] = paletteFor(cg.heroineName);
  const title = esc(cg.title || 'CG');
  const type = cg.type;

  const bg = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="${c3}" stop-opacity="0.85"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="38%" r="55%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="320" height="200" fill="url(#bg)"/>
<rect width="320" height="200" fill="url(#glow)"/>`;

  let scene = '';

  if (type === 'portrait') {
    scene = `
  <!-- 人物剪影 -->
  <ellipse cx="160" cy="62" rx="30" ry="34" fill="${c3}" opacity="0.9"/>
  <path d="M 105 190 C 105 150 130 128 160 128 C 190 128 215 150 215 190 Z" fill="${c3}" opacity="0.9"/>
  <path d="M 160 128 C 175 118 185 100 185 84 L 135 84 C 135 100 145 118 160 128 Z" fill="${c3}" opacity="0.55"/>
  <!-- 花瓣点缀 -->
  <g fill="${c2}" opacity="0.75">
    <circle cx="58" cy="46" r="4"/><circle cx="52" cy="58" r="3"/>
    <circle cx="264" cy="52" r="4"/><circle cx="272" cy="66" r="3"/>
    <circle cx="238" cy="150" r="3"/><circle cx="80" cy="158" r="3"/>
  </g>`;
  } else if (type.startsWith('h-')) {
    scene = `
  <!-- 暖光场景 -->
  <circle cx="160" cy="96" r="52" fill="${c2}" opacity="0.35"/>
  <circle cx="160" cy="96" r="30" fill="#ffffff" opacity="0.22"/>
  <path d="M 98 130 C 98 108 122 108 122 130 L 98 130 Z" fill="${c2}" opacity="0.5"/>
  <!-- 心形 -->
  <g fill="${c1}" opacity="0.9">
    <path d="M 160 72 C 160 64 150 62 150 70 C 150 76 160 82 160 84 C 160 82 170 76 170 70 C 170 62 160 64 160 72 Z" transform="scale(2.2) translate(-52 -26)"/>
  </g>
  <g fill="#ffffff" opacity="0.6">
    <circle cx="86" cy="46" r="3"/><circle cx="236" cy="40" r="3"/>
    <circle cx="250" cy="150" r="3"/><circle cx="66" cy="150" r="3"/>
  </g>`;
  } else if (type === 'event') {
    scene = `
  <!-- 窗景剪影 -->
  <rect x="96" y="46" width="128" height="104" rx="6" fill="#ffffff" opacity="0.16"/>
  <line x1="160" y1="46" x2="160" y2="150" stroke="#ffffff" stroke-opacity="0.3"/>
  <line x1="96" y1="98" x2="224" y2="98" stroke="#ffffff" stroke-opacity="0.3"/>
  <path d="M 160 150 L 172 186 L 148 186 Z" fill="${c3}" opacity="0.8"/>
  <circle cx="196" cy="84" r="10" fill="${c2}" opacity="0.8"/>
  <path d="M 84 190 C 84 168 116 168 116 190 Z" fill="${c3}" opacity="0.7"/>`;
  } else {
    scene = `
  <circle cx="160" cy="96" r="46" fill="#ffffff" opacity="0.14"/>
  <path d="M 130 190 C 130 158 150 140 160 140 C 170 140 190 158 190 190 Z" fill="${c3}" opacity="0.55"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
${bg}${scene}
  <text x="160" y="192" text-anchor="middle" font-size="11" fill="#ffffff" opacity="0.85" font-family="sans-serif">${title}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 获取 CG 展示图 URL
 *  - 有 imageUrl(真实图片)优先
 *  - 否则返回内置 SVG 场景插画
 *  - 均无兜底时返回 null(调用方用渐变占位)
 */
export function getCgArt(cg: Pick<CGEntry, 'type' | 'heroineName' | 'title' | 'imageUrl'>): string | null {
  if (cg.imageUrl) return cg.imageUrl;
  return buildCgArtSvg(cg);
}
