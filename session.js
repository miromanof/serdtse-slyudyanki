const KEY = 'slyudyankaSessionV1';
export function readSession(storage) {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (!value || value.version !== 1 || !Number.isInteger(value.progress) || value.progress < 0 || value.progress > 7 || !Number.isInteger(value.activeIndex) || value.activeIndex < 0 || value.activeIndex > value.progress) return null;
    return {
      activeIndex: value.activeIndex,
      progress: value.progress,
      stage: value.stage === 'transition' && value.activeIndex < 7 ? 'transition' : 'stop',
      completed: value.completed === true && value.activeIndex === 7 && value.progress === 7,
      audioTime: Number.isFinite(value.audioTime) && value.audioTime >= 0 ? value.audioTime : 0,
    };
  } catch { return null; }
}
export function saveSession(storage, state, audioTime = 0) {
  try {
    storage?.setItem(KEY, JSON.stringify({ version: 1, activeIndex: state.activeIndex, progress: state.progress, stage: state.stage, completed: state.completed, audioTime }));
  } catch { /* Storage restrictions must not block the guide. */ }
}
