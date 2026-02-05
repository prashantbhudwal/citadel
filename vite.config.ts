import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      // srcDirectory: 'src',
      // router: { routesDirectory: 'routes' },
      // prerender: {
      //   enabled: true,
      //   crawlLinks: true,
      //   filter: ({ path }) => !path.startsWith('/api'),
      // },
      // pages: [{ path: '/', prerender: { enabled: true } }],
    }),
    viteReact(),
  ],
})

export default config
