import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getAudioViewModel } from '../audio-view.js';

test('missing stop audio returns placeholder', () => {
  const view = getAudioViewModel(null, 'stop');
  assert.deepEqual(view, {
    status: 'missing',
    label: 'Аудиозапись об остановке будет добавлена позже',
    source: null,
  });
  assert.equal('duration' in view, false);
  assert.equal('transcript' in view, false);
});

test('missing transition audio returns directions placeholder', () => {
  const view = getAudioViewModel('', 'transition');
  assert.deepEqual(view, {
    status: 'missing',
    label: 'Аудиопереход с указаниями будет добавлен позже',
    source: null,
  });
});

test('configured audio returns playable source', () => {
  assert.deepEqual(getAudioViewModel('./audio/stop-01.mp3', 'stop'), {
    status: 'ready',
    label: 'Слушать запись об остановке',
    source: './audio/stop-01.mp3',
  });
});

test('page shell exposes accessible guide regions', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /name="viewport"/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /data-stop-player/);
  assert.doesNotMatch(html, /data-transition-player/);
  assert.doesNotMatch(html, /data-back-action/);
  assert.match(html, /data-route-list/);
  assert.match(html, /data-primary-action/);
  assert.match(html, /aria-label="Карта маршрута"/);
});
