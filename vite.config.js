import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // load ALL vars (no VITE_ filter)

  // Import server SDK once — only runs in Node.js/Vite dev server
  let AccessToken
  try {
    const sdk = await import('livekit-server-sdk')
    AccessToken = sdk.AccessToken
  } catch (_) {
    console.warn('[LiveKit] livekit-server-sdk yüklenemedi')
  }

  return {
    plugins: [
      react(),
      {
        name: 'livekit-token-api',
        configureServer(server) {
          server.middlewares.use('/api/livekit/token', async (req, res) => {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')

            try {
              if (!AccessToken) throw new Error('Server SDK yüklenemedi')

              const url = new URL(req.url, 'http://localhost')
              const room     = url.searchParams.get('room')
              const identity = url.searchParams.get('identity')
              const role     = url.searchParams.get('role') // 'host' | 'viewer'

              if (!room || !identity) {
                res.statusCode = 400
                return res.end(JSON.stringify({ error: 'room ve identity zorunlu' }))
              }

              const at = new AccessToken(
                env.LIVEKIT_API_KEY,
                env.LIVEKIT_API_SECRET,
                { identity, ttl: '4h' }
              )

              at.addGrant({
                room,
                roomJoin:       true,
                canPublish:     role === 'host',
                canSubscribe:   true,
                canPublishData: true,
              })

              const token = await at.toJwt()
              res.end(JSON.stringify({ token }))
            } catch (err) {
              console.error('[LiveKit Token]', err.message)
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        },
      },
    ],
    // Keep server SDK out of the browser bundle
    optimizeDeps: {
      exclude: ['livekit-server-sdk'],
    },
  }
})
