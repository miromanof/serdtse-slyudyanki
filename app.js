import { STOPS } from './data.js?v=audio-2';
import { getAudioViewModel } from './audio-view.js';
import { canOpenStop } from './guide-state.js';
import { readSession, saveSession } from './session.js';
import { createGuideMap } from './map.js?v=fast-map-11';
import { buildGoogleWalkingUrl, buildYandexWalkingUrl, requestVisitorLocation } from './navigation.js';

export function createInitialState(progress = 0) {
  const safeProgress = Number.isInteger(progress) ? Math.min(7, Math.max(0, progress)) : 0;
  return {
    activeIndex: safeProgress,
    progress: safeProgress,
    completed: false,
    stage: 'stop',
    visitorCoords: null,
    locationStatus: 'idle',
  };
}

export function selectStop(index, state) {
  if (!canOpenStop(index, state.progress)) return state;
  return { ...state, activeIndex: index, stage: 'stop', completed: false };
}

export function completeCurrentStage(state) {
  if (state.activeIndex === STOPS.length - 1) return { ...state, completed: true };
  if (state.stage !== 'transition') return { ...state, stage: 'transition' };
  const nextIndex = state.activeIndex + 1;
  return { ...state, activeIndex: nextIndex, progress: Math.max(state.progress, nextIndex), stage: 'stop', completed: false };
}

export function getTransitionTarget(index) {
  return Number.isInteger(index) && index >= 0 && index < STOPS.length - 1 ? STOPS[index + 1] : null;
}

export function shouldRefreshAudio(container, source, kind) {
  const normalized = typeof source === 'string' && source.trim() ? source.trim() : 'missing';
  return container?.dataset?.audioKey !== `${kind}:${normalized}`;
}

function audioMarkup(container, source, kind) {
  if (!shouldRefreshAudio(container, source, kind)) return;
  const view = getAudioViewModel(source, kind);
  container.replaceChildren();
  container.dataset.audioKey = `${kind}:${view.source ?? 'missing'}`;

  const heading = document.createElement('strong');
  heading.textContent = kind === 'transition' ? 'Как идти дальше' : 'Об этой остановке';

  if (view.status === 'ready') {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.setAttribute('controlsList', 'nodownload');
    audio.preload = 'auto';
    audio.src = view.source;
    audio.setAttribute('aria-label', view.label);
    const errorText = document.createElement('span');
    errorText.className = 'audio-error';
    audio.addEventListener('error', () => {
      errorText.textContent = 'Не удалось загрузить запись. Можно продолжить экскурсию.';
    });
    container.append(audio, errorText);
    return;
  }

  const icon = document.createElement('span');
  icon.className = 'audio-panel__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = kind === 'transition' ? '→' : '♪';
  const copy = document.createElement('span');
  copy.className = 'audio-panel__copy';
  const title = document.createElement('strong');
  title.textContent = kind === 'transition' ? 'Как идти дальше' : 'Об этой остановке';
  const note = document.createElement('span');
  note.textContent = view.label;
  copy.append(title, note);
  container.append(icon, copy);
}

function locationCopy(status) {
  return {
    idle: 'Геолокация ещё не включена',
    loading: 'Определяем ваше местоположение…',
    granted: 'Местоположение учтено в ссылке пешего маршрута',
    denied: 'Доступ к геолокации отклонён. Экскурсия продолжает работать.',
    timeout: 'Не удалось быстро определить геопозицию. Попробуйте ещё раз.',
    unavailable: 'Геолокация сейчас недоступна. Экскурсия продолжает работать.',
    'map-unavailable': 'Карта недоступна. Аудио и порядок экскурсии продолжают работать.',
  }[status] ?? 'Геолокация недоступна';
}

export function startGuide() {
  return true;
}

function bootstrap() {
  const startScreen = document.querySelector('[data-start-screen]');
  const app = document.querySelector('[data-app]');
  const startAction = document.querySelector('[data-start-action]');
  const stopNumber = document.querySelector('[data-stop-number]');
  const stopTitle = document.querySelector('[data-stop-title]');
  const stopPlayer = document.querySelector('[data-stop-player]');
  const primaryAction = document.querySelector('[data-primary-action]');
  const routeList = document.querySelector('[data-route-list]');
  const progressLabel = document.querySelector('[data-progress-label]');
  const progressPercent = document.querySelector('[data-progress-percent]');
  const progressBar = document.querySelector('[data-progress-bar]');
  const locationStatus = document.querySelector('[data-location-status]');
  const destinationTitle = document.querySelector('[data-destination-title]');
  const navigationLink = document.querySelector('[data-navigation-link]');
  const navigationFallback = document.querySelector('[data-navigation-fallback]');
  const orientationNote = document.querySelector('[data-orientation-note]');

  let storage = null;
  try { storage = window.localStorage; } catch { /* Continue without persistence. */ }
  const saved = readSession(storage);
  let state = { ...createInitialState(), ...saved };
  let pendingAudioTime = saved?.audioTime ?? 0;
  let guideMap = null;

  function persist() {
    const audio = stopPlayer.querySelector('audio');
    saveSession(storage, state, audio?.readyState >= 1 ? audio.currentTime : pendingAudioTime);
  }
  function showFinish() {
    stopPlayer.querySelector('audio')?.pause();
    app.hidden = true;
    startScreen.hidden = true;
    document.querySelector('[data-finish-screen]').hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('#finish-title').focus({ preventScroll: true });
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

  function destinationForCurrent() {
    return getTransitionTarget(state.activeIndex);
  }

  function renderRoute() {
    routeList.replaceChildren();
    STOPS.forEach((stop, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const unlocked = canOpenStop(index, state.progress);
      button.type = 'button';
      button.className = `route-item${index === state.activeIndex ? ' is-current' : ''}${index < state.progress || state.completed ? ' is-complete' : ''}${!unlocked ? ' is-locked' : ''}`;
      button.disabled = !unlocked;
      button.dataset.stopIndex = String(index);
      button.setAttribute('aria-current', index === state.activeIndex ? 'step' : 'false');
      button.innerHTML = `<span class="route-item__number">${index < state.progress || state.completed ? '✓' : String(index + 1).padStart(2, '0')}</span><span><strong></strong></span><span aria-hidden="true">${!unlocked ? '○' : '›'}</span>`;
      button.querySelector('strong').textContent = stop.title;
      button.addEventListener('click', () => {
        state = selectStop(index, state);
        pendingAudioTime = 0;
        saveSession(storage, state, 0);
        renderGuide();
      });
      item.append(button);
      routeList.append(item);
    });
  }

  function renderNavigation() {
    if (!destinationTitle) return;
    const destination = destinationForCurrent();
    if (!destination) {
      destinationTitle.textContent = 'Маршрут завершён';
      navigationLink.hidden = true;
      navigationFallback.hidden = true;
      orientationNote.textContent = 'После этой точки нет следующей остановки.';
      return;
    }
    destinationTitle.textContent = destination.title;
    navigationLink.hidden = false;
    navigationFallback.hidden = true;
    navigationLink.href = buildGoogleWalkingUrl(destination, state.visitorCoords);
    navigationFallback.href = buildGoogleWalkingUrl(destination, state.visitorCoords);
    orientationNote.textContent = 'Пеший маршрут откроется в Google Maps.';
  }

  function renderGuide() {
    const stop = STOPS[state.activeIndex];
    const displayed = state.activeIndex + 1;
    stopNumber.textContent = String(displayed).padStart(2, '0');
    stopTitle.textContent = state.stage === 'transition'
      ? `Переход от точки ${displayed} к точке ${displayed + 1}`
      : stop.title;
    if (state.stage === 'transition') {
      stopTitle.replaceChildren(
        document.createTextNode('Переход от точки'),
        document.createElement('br'),
        document.createTextNode(`${displayed} к точке ${displayed + 1}`),
      );
    }
    if (stop.id === 6 && state.stage !== 'transition') {
      const firstLine = document.createElement('span');
      firstLine.className = 'stop-title-line';
      firstLine.textContent = 'Свято-Никольская';
      stopTitle.replaceChildren(firstLine, document.createElement('br'), document.createTextNode('церковь'));
    }
    progressLabel.textContent = state.completed ? 'Маршрут пройден' : `Остановка ${displayed} из ${STOPS.length}`;
    const completedStops = state.completed ? STOPS.length : state.progress + (state.stage === 'transition' && state.activeIndex === state.progress ? 1 : 0);
    const progressValue = (completedStops / STOPS.length) * 100;
    progressPercent.textContent = `${Math.round(progressValue)}%`;
    progressBar.style.width = `${progressValue}%`;
    const isTransition = state.stage === 'transition';
    stopPlayer.classList.toggle('audio-panel--transition', isTransition);
    audioMarkup(stopPlayer, isTransition ? stop.transitionAudio : stop.stopAudio, isTransition ? 'transition' : 'stop');
    const audio = stopPlayer.querySelector('audio');
    if (audio && !audio.dataset.sessionBound) {
      audio.dataset.sessionBound = 'true';
      const resumeTime = pendingAudioTime;
      const restoreTime = () => {
        if (resumeTime > 0 && Number.isFinite(audio.duration)) audio.currentTime = Math.min(resumeTime, Math.max(0, audio.duration - .1));
      };
      if (audio.readyState >= 1) restoreTime();
      else audio.addEventListener('loadedmetadata', restoreTime, { once: true });
      for (const event of ['timeupdate', 'pause', 'seeked']) audio.addEventListener(event, () => {
        if (stopPlayer.querySelector('audio') === audio) persist();
      });
    }
    primaryAction.disabled = state.completed;
    primaryAction.textContent = state.completed
      ? 'Экскурсия завершена'
      : state.activeIndex === STOPS.length - 1
          ? 'Завершить экскурсию'
          : isTransition ? `Я на месте. Открыть точку ${displayed + 1}` : 'К следующей точке';
    locationStatus.textContent = locationCopy(state.locationStatus);
    renderRoute();
    renderNavigation();
    guideMap?.setActiveStop(state.activeIndex, state.progress, isTransition);
    guideMap?.setTransitionTarget(state.activeIndex < STOPS.length - 1 ? state.activeIndex + 1 : null);
  }

  async function locateVisitor() {
    state = { ...state, locationStatus: 'loading' };
    renderGuide();
    const result = await requestVisitorLocation();
    state = {
      ...state,
      locationStatus: result.status === 'granted' && guideMap && !guideMap.available ? 'map-unavailable' : result.status,
      visitorCoords: result.coords,
    };
    if (result.coords) {
      guideMap?.setVisitorPosition(result.coords);
      guideMap?.fitGuide();
    }
    renderGuide();
  }

  startAction.addEventListener('click', () => {
    saveSession(storage, state, pendingAudioTime);
    startScreen.hidden = true;
    app.hidden = false;
    renderGuide();
    try {
    guideMap ??= createGuideMap(document.querySelector('#map'), STOPS, undefined, (status) => {
      state = { ...state, locationStatus: status };
      locationStatus.textContent = locationCopy(status);
    });
    } catch (error) {
      console.error('Не удалось создать Google Maps', error);
      guideMap = null;
    }
    if (!guideMap?.available) state = { ...state, locationStatus: 'map-unavailable' };
    renderGuide();
  });

  primaryAction.addEventListener('click', () => {
    const previousScrollY = window.scrollY;
    state = completeCurrentStage(state);
    pendingAudioTime = 0;
    saveSession(storage, state, 0);
    if (state.completed) {
      showFinish();
      return;
    }
    renderGuide();
    window.scrollTo({ top: previousScrollY, behavior: 'instant' });
  });
  // Warm up the first map while the visitor is on the welcome screen.
  try { guideMap = createGuideMap(document.querySelector('#map'), STOPS); }
  catch { guideMap = null; }
  if (saved?.completed) showFinish();
  else if (saved) startAction.click();
}

if (typeof document !== 'undefined') bootstrap();
