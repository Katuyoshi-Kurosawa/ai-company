import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import type { Plugin } from 'vite'

// relay.js を dev サーバーと同時に起動・終了するプラグイン
function relayServerPlugin(): Plugin {
  let relayProc: ChildProcess | null = null

  return {
    name: 'relay-server',
    apply: 'serve', // dev モードのみ
    configureServer() {
      const relayPath = path.resolve(__dirname, '..', 'relay.js')

      // 既に起動しているか確認してから起動
      fetch('http://localhost:3939/health', { signal: AbortSignal.timeout(500) })
        .then(() => {
          console.log('\n  🔗 relay.js は既に起動中（スキップ）\n')
        })
        .catch(() => {
          console.log('\n  🔗 relay.js を自動起動...')
          relayProc = spawn('node', [relayPath], {
            stdio: 'inherit',
            detached: false,
          })
          relayProc.on('error', (err) => {
            console.error('  ❌ relay.js 起動失敗:', err.message)
          })
          relayProc.on('exit', (code) => {
            if (code !== null && code !== 0) {
              console.warn(`  ⚠️ relay.js が終了 (code: ${code})`)
            }
            relayProc = null
          })
        })
    },
    closeBundle() {
      if (relayProc) {
        relayProc.kill('SIGTERM')
        relayProc = null
      }
    },
    // Vite devサーバー終了時にもクリーンアップ
    buildEnd() {
      if (relayProc) {
        relayProc.kill('SIGTERM')
        relayProc = null
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), relayServerPlugin()],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
