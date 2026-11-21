// Core behavior tests require the app's TypeScript to be bundled by Vite.
// The full test run also includes TypeScript checking and production bundling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('source retains CSV validation, certificate and retake drafts, and offline behavior', () => {
  const core = readFileSync(join('src', 'core.ts'), 'utf8');
  const app = readFileSync(join('src', 'app.tsx'), 'utf8');
  assert.match(core, /parseStudentCSV/);
  assert.match(core, /Duplicate email and course combination/);
  assert.match(core, /Score must be a number between 0 and 100/);
  assert.match(core, /type: 'certificate'/);
  assert.match(core, /type: 'retake'/);
  assert.match(app, /Real email delivery is intentionally disabled/);
  assert.match(app, /new FileReader/);
});
