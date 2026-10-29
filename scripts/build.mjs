import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/assets', { recursive: true });
await build({ entryPoints: ['src/main.jsx'], outfile: 'dist/assets/app.js', bundle: true, minify: true, sourcemap: false, target: ['es2022'], jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof' });
await copyFile('index.html', 'dist/index.html');
console.log('React workspace built in dist/');
