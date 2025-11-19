import { getLyrics } from '@/server/lyrics'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/lyrics/')({
  server: {
    handlers: {
      GET: async () => {
        const lyrics = await getLyrics()
        return new Response(JSON.stringify(lyrics), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
    },
  },
})
