import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server.ts', seed: 'prisma/seed.ts', 'db-check': 'src/scripts/db-check.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  splitting: false,
  // Workspace packages ship TypeScript sources, so they are bundled; npm deps stay external.
  noExternal: ['@vyora/shared'],
  esbuildOptions(options) {
    options.alias = { '@': './src' };
  },
});
