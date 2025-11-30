import ky from 'ky'

export const geniusApi = ky.create({
  prefixUrl: 'https://www.genius.com/api',
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  retry: {
    limit: 3,
    methods: ['get'],
    statusCodes: [429, 500, 502, 503, 504],
  },
})

export type TGeniusApi = typeof geniusApi
