import { buildGoogleWalkingUrl } from './navigation.js';

export function createGuideMap(element, stops) {
  if (!element || !stops.length || typeof document === 'undefined') return { available: false, status: 'Карта недоступна. Экскурсия продолжает работать.', setActiveStop() {}, setTransitionTarget() {}, setVisitorPosition() {}, fitGuide() {} };
  const frame = document.createElement('iframe');
  frame.title = 'Google Maps — остановка аудиомаршрута';
  frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
  frame.allowFullscreen = true;
  const fallback = document.createElement('a');
  fallback.className = 'map-open-link';
  fallback.textContent = 'Открыть эту точку в Google Maps';
  fallback.target = '_blank';
  fallback.rel = 'noopener';
  element.replaceChildren(frame, fallback);
  let activeKey = '';
  function showStop(index, progress = index, isTransition = false) {
    if (!stops[index]) return;
    const destinationIndex = isTransition && stops[index + 1] ? index + 1 : index;
    const key = `${index}:${destinationIndex}`;
    if (key === activeKey) return;
    activeKey = key;
    const stop = stops[destinationIndex];
    frame.title = `Google Maps — ${stop.title}`;
    const url = new URL('https://maps.google.com/maps');
    url.searchParams.set('q', `${stop.lat},${stop.lng}`);
    url.searchParams.set('z', '16');
    url.searchParams.set('t', 'k');
    url.searchParams.set('hl', 'ru');
    url.searchParams.set('output', 'embed');
    frame.src = url.href;
    const external = new URL('https://www.google.com/maps/search/');
    external.searchParams.set('api', '1');
    external.searchParams.set('query', `${stop.lat},${stop.lng}`);
    if (destinationIndex !== index) {
      const from = stops[index];
      fallback.href = buildGoogleWalkingUrl(stop, { latitude: from.lat, longitude: from.lng });
      fallback.textContent = 'Проложить маршрут в Google Maps';
    } else {
      fallback.href = external.href;
      fallback.textContent = 'Открыть эту точку в Google Maps';
    }
  }
  showStop(0);
  return { available: true, status: 'ready', setActiveStop: showStop, setTransitionTarget() {}, setVisitorPosition() {}, fitGuide() {} };
}
