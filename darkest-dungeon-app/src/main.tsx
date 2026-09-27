import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { bootstrapKernel } from './stores/kernelIntegration'
import { seedBuiltinLore } from './gateway/loreScheduler'

try {
  bootstrapKernel()
} catch (err) {
  console.error('[DD] Kernel 启动失败', err)
}

try {
  seedBuiltinLore()
} catch (err) {
  console.error('[DD] 世界书播种失败', err)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
