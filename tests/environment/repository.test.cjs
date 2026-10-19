/* eslint-disable @typescript-eslint/no-require-imports -- Repository integrity regression checks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

test('npm manifests are valid JSON and agree on locked dependencies', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const group of ['dependencies', 'devDependencies']) {
    assert.deepEqual(manifest[group], lock.packages[''][group], group + ' does not match the lockfile');
  }
});

test('tracked code, documentation and environment template contain no unresolved merge markers', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const conflicts = [];
  for (const file of files) {
    if (file !== '.env.example' && !/\.(?:[cm]?[jt]sx?|json|md|css|ya?ml|txt)$/.test(file)) continue;
    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) continue;
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      if (/^(?:<{7}|>{7}|\|{7})(?: |$)/.test(lines[index])) conflicts.push(file + ':' + (index + 1));
    }
  }
  assert.deepEqual(conflicts, [], 'Unresolved merge markers remain in: ' + conflicts.join(', '));
});
