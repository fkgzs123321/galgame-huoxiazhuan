/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dd: {
          // 深层背景 — 接近黑色的棕调
          void:       '#0a0705',
          bg:         '#15110d',
          bgLight:    '#1e1813',
          // 面板表面 — 暗棕石质
          surface:    '#241d16',
          surface2:   '#2e251c',
          surface3:  '#3a2f22',
          // 边框 — 铁锈金属
          border:     '#4a3a28',
          borderLight:'#6a5238',
          borderGold: '#8a7028',
          // 文字 — 羊皮纸色
          text:       '#c8b890',
          textBright: '#e8d8b0',
          textMuted:  '#7a6a50',
          textDim:    '#5a4a38',
          // 金色 — 烛火金
          gold:       '#c8a030',
          goldBright: '#e8c050',
          goldDark:   '#8a6810',
          // 血红 — 战斗与危险
          blood:      '#6b1818',
          red:        '#8b2020',
          redBright:  '#c83030',
          // 暗绿 — 毒素与生命
          green:      '#3d5a28',
          greenBright:'#5a8038',
          // 暗蓝 — 神秘
          blue:       '#2a3a5a',
          blueBright: '#4a6088',
          // 暗紫 — 腐化
          purple:     '#4a2a5a',
          purpleBright:'#6a3a78',
          // 压力红
          stress:     '#7a2820',
          stressBright:'#a83828',
          // 火把
          torch:      '#e8a030',
          torchBright:'#f8c040',
        }
      },
      fontFamily: {
        dd: ['"Cinzel"', '"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', '"Consolas"', 'monospace'],
      },
      fontSize: {
        dd: {
          xs: '10px',
          sm: '12px',
          base: '14px',
          lg: '16px',
          xl: '20px',
          '2xl': '26px',
          '3xl': '34px',
        }
      },
      boxShadow: {
        'dd-inset': 'inset 0 2px 8px rgba(0,0,0,0.6), inset 0 0 2px rgba(200,160,48,0.1)',
        'dd-panel': '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,160,48,0.05), inset 0 -1px 0 rgba(0,0,0,0.3)',
        'dd-gold': '0 0 12px rgba(200,160,48,0.3)',
        'dd-blood': '0 0 12px rgba(139,32,32,0.4)',
      },
      keyframes: {
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'fog-drift': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'flicker': 'flicker 3s ease-in-out infinite',
        'fog': 'fog-drift 60s linear infinite',
      },
    },
  },
  plugins: [],
}
