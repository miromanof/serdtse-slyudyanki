import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGoogleWalkingUrl,
  buildYandexWalkingUrl,
  requestVisitorLocation,
} from '../navigation.js';
import { createGuideMap } from '../map.js';
import { STOPS } from '../data.js';

const destination = { title: 'Каменная баня', lat: 51.6573548678438, lng: 103.71919814370347 };
const visitor = { latitude: 51.6563, longitude: 103.7207 };

test('Yandex walking URL includes exact destination and optional origin', () => {
  const url = new URL(buildYandexWalkingUrl(destination, visitor));
  assert.equal(url.hostname, 'yandex.ru');
  assert.equal(url.searchParams.get('rtt'), 'pd');
  assert.equal(url.searchParams.get('rtext'), '51.6563,103.7207~51.6573548678438,103.71919814370347');
});

test('Yandex walking URL works without visitor origin', () => {
  const url = new URL(buildYandexWalkingUrl(destination));
  assert.equal(url.searchParams.get('rtext'), '51.6573548678438,103.71919814370347');
});

test('Google walking URL encodes title and coordinates', () => {
  const url = new URL(buildGoogleWalkingUrl(destination, visitor));
  assert.equal(url.hostname, 'www.google.com');
  assert.equal(url.searchParams.get('travelmode'), 'walking');
  assert.equal(url.searchParams.get('origin'), '51.6563,103.7207');
  assert.equal(url.searchParams.get('destination'), '51.6573548678438,103.71919814370347');
  assert.match(url.href, /api=1/);
});

test('navigation URL rejects a missing destination', () => {
  assert.equal(buildYandexWalkingUrl(null, visitor), null);
  assert.equal(buildGoogleWalkingUrl(undefined, visitor), null);
});

test('geolocation denial resolves to a non-throwing status', async () => {
  const geolocation = {
    getCurrentPosition(_success, error) {
      error({ code: 1 });
    },
  };
  assert.deepEqual(await requestVisitorLocation({ geolocation }), { status: 'denied', coords: null });
});

test('missing geolocation resolves unavailable', async () => {
  assert.deepEqual(await requestVisitorLocation({ geolocation: null }), { status: 'unavailable', coords: null });
});

test('map adapter reports unavailable outside a browser', () => {
  const adapter = createGuideMap({}, STOPS, null);
  assert.equal(adapter.available, false);
  assert.equal(adapter.status, 'Карта недоступна. Экскурсия продолжает работать.');
});
