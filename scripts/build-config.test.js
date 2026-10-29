import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('los artefactos Windows NSIS y portable usan nombres distintos', () => {
  const installerName = manifest.build.nsis.artifactName;
  const portableName = manifest.build.portable.artifactName;

  assert.ok(manifest.build.win.target.includes('nsis'));
  assert.ok(manifest.build.win.target.includes('portable'));
  assert.notEqual(installerName, portableName);
  assert.match(installerName, /Instalador/);
  assert.match(portableName, /Portable/);
});
