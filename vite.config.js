import { dirname, resolve } from 'node:path'
import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageInfo = fs.readJsonSync(path.join(__dirname, 'package.json'))

export default defineConfig({
  plugins: [nodePolyfills({})],
  build: {
    outDir: './lib',
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled into your library
      external: Object.keys(packageInfo.dependencies)
    },
    lib: {
      entry: resolve(__dirname, './src/index.js'),
      name: '@kalisio/feathers-localforage',
      // the proper extensions will be added
      fileName: 'feathers-localforage',
    }
  }
})
