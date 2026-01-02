import { createFileRoute } from '@tanstack/react-router'
import { serve } from 'inngest/edge'
import { inngest } from '@/server/inngest/client'
import { citadelWorkflow } from '@/server/inngest/workflows/citadel'

const handler = serve({
  client: inngest,
  functions: [citadelWorkflow],
  streaming: 'force', // Search result recommended this
})

export const Route = createFileRoute('/api/inngest')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await handler(request)
        } catch (e) {
          console.error('Inngest GET Error:', e)
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
          })
        }
      },
      POST: async ({ request }) => {
        try {
          return await handler(request)
        } catch (e) {
          console.error('Inngest POST Error:', e)
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
          })
        }
      },
      PUT: async ({ request }) => {
        try {
          return await handler(request)
        } catch (e) {
          console.error('Inngest PUT Error:', e)
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
          })
        }
      },
    },
  },
})
