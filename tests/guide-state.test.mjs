import test from 'node:test';
import assert from 'node:assert/strict';

import { STOPS } from '../data.js';
import {
  canOpenStop,
  completeStop,
  getNextStop,
  getProgress,
  setProgress,
} from '../guide-state.js';

const EXPECTED = [
  ['Водонапорная Башня', 51.65637688466191, 103.72072177193145],
  ['Каменная баня', 51.6573548678438, 103.71919814370347],
  ['Мраморный вокзал', 51.658679356738936, 103.72441204564007],
  ['Железнодорожный узел', 51.65932959107979, 103.72229107311071],
  ['Камень, кирпич и люди большой стройки', 51.65864166058295, 103.72489036601274],
  ['Свято-Никольская церковь', 51.65975728353604, 103.7259819395122],
  ['Стеклоделательный завод', 51.66094982561602, 103.72503157270862],
  ['Байкал', 51.660078242341065, 103.7267304113153],
];

function memoryStorage(initial = {}) {
  const state = new Map(Object.entries(initial));
  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => state.set(key, String(value)),
  };
}

test('route data preserves exact order and coordinates', () => {
  assert.equal(STOPS.length, 8);
  assert.deepEqual(
    STOPS.map(({ title, lat, lng }) => [title, lat, lng]),
    EXPECTED,
  );
  for (const stop of STOPS) {
    assert.equal(stop.stopAudio, stop.id === 1 ? './audio/stop-1-web.mp3' : `./audio/stop-${stop.id}.mp3`);
    assert.equal(stop.transitionAudio, stop.id < 8 ? `./audio/transition-${stop.id}.mp3` : null);
  }
});

test('saved progress is clamped', () => {
  assert.equal(getProgress(memoryStorage({ slyudyankaGuideProgress: '-9' })), 0);
  assert.equal(getProgress(memoryStorage({ slyudyankaGuideProgress: '999' })), 7);
  assert.equal(getProgress(memoryStorage({ slyudyankaGuideProgress: 'nope' })), 0);
  const storage = memoryStorage();
  assert.equal(setProgress(storage, 99), 7);
  assert.equal(getProgress(storage), 7);
});

test('future stops stay locked', () => {
  assert.equal(canOpenStop(0, 0), true);
  assert.equal(canOpenStop(1, 0), false);
  assert.equal(canOpenStop(7, 3), false);
  assert.equal(canOpenStop(99, 7), false);
});

test('completed stops can reopen', () => {
  assert.equal(canOpenStop(0, 4), true);
  assert.equal(canOpenStop(3, 4), true);
  assert.equal(completeStop(2, 4), 4);
  assert.equal(completeStop(4, 4), 5);
});

test('stop eight has no next stop', () => {
  assert.equal(getNextStop(6)?.id, 8);
  assert.equal(getNextStop(7), null);
  assert.equal(completeStop(7, 7), 7);
});

test('storage exceptions fall back without blocking the guide', () => {
  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.equal(getProgress(brokenStorage), 0);
  assert.equal(setProgress(brokenStorage, 4), 4);
});
