function point(stop) {
  return stop && Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
    ? `${stop.lat},${stop.lng}`
    : null;
}

function origin(visitor) {
  return visitor && Number.isFinite(visitor.latitude) && Number.isFinite(visitor.longitude)
    ? `${visitor.latitude},${visitor.longitude}`
    : null;
}

export function buildYandexWalkingUrl(stop, visitor = null) {
  const destination = point(stop);
  if (!destination) return null;
  const params = new URLSearchParams({ mode: 'routes', rtt: 'pd' });
  const visitorOrigin = origin(visitor);
  params.set('rtext', visitorOrigin ? `${visitorOrigin}~${destination}` : destination);
  return `https://yandex.ru/maps/?${params.toString()}`;
}

export function buildGoogleWalkingUrl(stop, visitor = null) {
  const destination = point(stop);
  if (!destination) return null;
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'walking' });
  const visitorOrigin = origin(visitor);
  if (visitorOrigin) params.set('origin', visitorOrigin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function requestVisitorLocation({ geolocation = globalThis.navigator?.geolocation, timeout = 10000 } = {}) {
  if (!geolocation?.getCurrentPosition) {
    return Promise.resolve({ status: 'unavailable', coords: null });
  }

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        status: 'granted',
        coords: { latitude: coords.latitude, longitude: coords.longitude },
      }),
      (error) => resolve({
        status: error?.code === 1 ? 'denied' : error?.code === 3 ? 'timeout' : 'unavailable',
        coords: null,
      }),
      { enableHighAccuracy: true, timeout, maximumAge: 15000 },
    );
  });
}

