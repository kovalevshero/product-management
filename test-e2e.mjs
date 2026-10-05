import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js',
  '--config', 'test/jest-e2e.json', '--runInBand'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
