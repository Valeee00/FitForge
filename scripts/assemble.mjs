import { cp, mkdir, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'dist');
for (const app of ['shell', 'workouts', 'progress']) await access(path.join(root, 'apps', app, 'dist', 'index.html'));
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(path.join(root, 'apps/shell/dist'), dest, { recursive: true });
// Copy COMPLETE remote builds: shared fallback chunks must not be removed.
await cp(path.join(root, 'apps/workouts/dist'), path.join(dest, 'mfe-workouts'), { recursive: true });
await cp(path.join(root, 'apps/progress/dist'), path.join(dest, 'mfe-progress'), { recursive: true });
await cp(path.join(root, 'staticwebapp.config.json'), path.join(dest, 'staticwebapp.config.json'));
console.log('Build pronto: dist/ (shell + mfe-workouts + mfe-progress).');
