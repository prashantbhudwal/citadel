import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    viteReact(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      'public',
      'src/server/**',
    ],
    projects: [
      {
        root: './src/server',
        test: {
          globals: true,
          environment: 'node',
          include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
          exclude: ['node_modules', 'dist', 'build', 'coverage', 'public'],
        },
      },
    ],
  },
})
