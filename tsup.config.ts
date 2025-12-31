import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: false,
    clean: true,
    outDir: 'dist',
    external: ['vue'],
    minify: false,
    splitting: false,
    shims: true,
    target: 'es2020',
    define: {
        __DEV__: 'true'
    }
})
