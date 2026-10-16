import { STOPS } from './data.js?v=audio-2';
import { getAudioViewModel } from './audio-view.js';
import { canOpenStop } from './guide-state.js';
import { createGuideMap } from './map.js?v=route-label-10';
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
    audio.preload = 'metadata';
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

  let state = createInitialState();
  let guideMap = null;

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
    progressPercent.textContent = `${state.completed ? 100 : Math.round((displayed / STOPS.length) * 100)}%`;
    progressBar.style.width = `${state.completed ? 100 : (displayed / STOPS.length) * 100}%`;
    const isTransition = state.stage === 'transition';
    stopPlayer.classList.toggle('audio-panel--transition', isTransition);
    audioMarkup(stopPlayer, isTransition ? stop.transitionAudio : stop.stopAudio, isTransition ? 'transition' : 'stop');
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
    startScreen.hidden = true;
    app.hidden = false;
    renderGuide();
    try {
    guideMap = createGuideMap(document.querySelector('#map'), STOPS, undefined, (status) => {
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
    state = completeCurrentStage(state);
    if (state.completed) {
      stopPlayer.querySelector('audio')?.pause();
      app.hidden = true;
      document.querySelector('[data-finish-screen]').hidden = false;
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelector('#finish-title').focus({ preventScroll: true });
      return;
    }
    renderGuide();
    document.querySelector('.stop-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

if (typeof document !== 'undefined') bootstrap();
