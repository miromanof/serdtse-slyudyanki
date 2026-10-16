import { STOPS } from './data.js';

const STORAGE_KEY = 'slyudyankaGuideProgress';

function clampProgress(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(STOPS.length - 1, Math.max(0, parsed));
}

export function getProgress(storage) {
  try {
    return clampProgress(storage?.getItem(STORAGE_KEY));
  } catch {
    return 0;
  }
}

export function setProgress(storage, value) {
  const progress = clampProgress(value);
  try {
    storage?.setItem(STORAGE_KEY, String(progress));
  } catch {
    // Continue in memory when private browsing or browser policy blocks storage.
  }
  return progress;
}

export function canOpenStop(index, progress) {
  return Number.isInteger(index) && index >= 0 && index < STOPS.length && index <= clampProgress(progress);
}

export function completeStop(index, progress) {
  const safeProgress = clampProgress(progress);
  if (!canOpenStop(index, safeProgress) || index !== safeProgress) return safeProgress;
  return Math.min(STOPS.length - 1, safeProgress + 1);
}

export function getNextStop(index) {
  return Number.isInteger(index) && index >= 0 && index < STOPS.length - 1
    ? STOPS[index + 1]
    : null;
}
