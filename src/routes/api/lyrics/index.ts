import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/lyrics/')({
  server: {
    handlers: {
      GET: () => {
        return new Response(JSON.stringify('lyrics'), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
    },
  },
})
