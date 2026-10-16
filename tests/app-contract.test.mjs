import test from 'node:test';
import assert from 'node:assert/strict';

import {
  completeCurrentStage,
  createInitialState,
  getTransitionTarget,
  selectStop,
  shouldRefreshAudio,
} from '../app.js';

test('locked index cannot be selected', () => {
  const state = createInitialState(0);
  assert.equal(selectStop(4, state), state);
  assert.equal(state.activeIndex, 0);
});

test('current completion unlocks exactly one stop', () => {
  const initial = createInitialState(0);
  const transition = completeCurrentStage(initial);
  assert.equal(transition.stage, 'transition');
  assert.equal(transition.progress, 0);
  assert.equal(transition.activeIndex, 0);
  const next = completeCurrentStage(transition);
  assert.deepEqual(next, { ...initial, activeIndex: 1, progress: 1, completed: false });
  assert.equal(selectStop(2, next), next);
});

test('reopening a completed stop does not reduce progress', () => {
  const state = createInitialState(5);
  const older = selectStop(2, state);
  assert.equal(older.activeIndex, 2);
  assert.equal(older.progress, 5);
  const afterReplay = completeCurrentStage(older);
  assert.equal(afterReplay.progress, 5);
});

test('missing audio still allows completion', () => {
  const state = { ...createInitialState(3), audioAvailable: false };
  assert.equal(completeCurrentStage(completeCurrentStage(state)).progress, 4);
});

test('final transition returns completed state', () => {
  const final = completeCurrentStage({ ...createInitialState(7), activeIndex: 7 });
  assert.equal(final.completed, true);
  assert.equal(final.activeIndex, 7);
  assert.equal(final.progress, 7);
});

test('location-only rendering preserves an existing audio player', () => {
  const container = { dataset: { audioKey: 'stop:./audio/stop-01.mp3' } };
  assert.equal(shouldRefreshAudio(container, './audio/stop-01.mp3', 'stop'), false);
  assert.equal(shouldRefreshAudio(container, './audio/stop-02.mp3', 'stop'), true);
});

test('transition target is the next stop and disappears after stop eight', () => {
  assert.equal(getTransitionTarget(0)?.id, 2);
  assert.equal(getTransitionTarget(6)?.id, 8);
  assert.equal(getTransitionTarget(7), null);
});
