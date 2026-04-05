import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin.ts', 'src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  dts: { entry: 'src/cli.ts' },
  splitting: true,
  clean: true,
  banner: ({ format }) => {
    if (format === 'esm') {
      return { js: '' };
    }
    return {};
  },
});
