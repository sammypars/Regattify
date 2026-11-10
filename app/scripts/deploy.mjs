// Builds the app into the repo root so GitHub Pages (main branch, root) serves it.
import { execSync } from 'node:child_process';
import { rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
rmSync(path.join(repoRoot, 'assets'), { recursive: true, force: true });
execSync('npx vite build', { stdio: 'inherit', cwd: path.join(repoRoot, 'app') });
writeFileSync(path.join(repoRoot, '.nojekyll'), '');
copyFileSync(path.join(repoRoot, 'index.html'), path.join(repoRoot, '404.html'));
console.log('Built to repo root. Commit and push main to publish.');
