import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import chatHandler from './api/chat.js'

export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    react(),
    {
      name: 'local-chat-api',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req, res, next) => {
          if (req.method !== 'POST') {
            return next()
          }

          try {
            await chatHandler(req, res)
          } catch (error) {
            if (!res.writableEnded) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Unexpected dev chat server error.',
                }),
              )
            }
          }
        })
      },
    },
  ],
})
