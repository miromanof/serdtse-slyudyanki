const COPY = {
  stop: {
    missing: 'Аудиозапись об остановке будет добавлена позже',
    ready: 'Слушать запись об остановке',
  },
  transition: {
    missing: 'Аудиопереход с указаниями будет добавлен позже',
    ready: 'Слушать, куда идти дальше',
  },
};

export function getAudioViewModel(source, kind) {
  const safeKind = kind === 'transition' ? 'transition' : 'stop';
  const normalizedSource = typeof source === 'string' && source.trim() ? source.trim() : null;
  return {
    status: normalizedSource ? 'ready' : 'missing',
    label: COPY[safeKind][normalizedSource ? 'ready' : 'missing'],
    source: normalizedSource,
  };
}

