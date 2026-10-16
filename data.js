const ROUTE = [
  { id: 1, title: 'Водонапорная Башня', lat: 51.65637688466191, lng: 103.72072177193145, stopAudio: null, transitionAudio: null },
  { id: 2, title: 'Каменная баня', lat: 51.6573548678438, lng: 103.71919814370347, stopAudio: null, transitionAudio: null },
  { id: 3, title: 'Мраморный вокзал', lat: 51.658679356738936, lng: 103.72441204564007, stopAudio: null, transitionAudio: null },
  { id: 4, title: 'Железнодорожный узел', lat: 51.65932959107979, lng: 103.72229107311071, stopAudio: null, transitionAudio: null },
  { id: 5, title: 'Камень, кирпич и люди большой стройки', lat: 51.65725501789602, lng: 103.71767462601923, stopAudio: null, transitionAudio: null },
  { id: 6, title: 'Свято-Никольская церковь', lat: 51.65975728353604, lng: 103.7259819395122, stopAudio: null, transitionAudio: null },
  { id: 7, title: 'Стеклоделательный завод', lat: 51.66094982561602, lng: 103.72503157270862, stopAudio: null, transitionAudio: null },
  { id: 8, title: 'Байкал', lat: 51.660078242341065, lng: 103.7267304113153, stopAudio: null, transitionAudio: null },
];

export const STOPS = Object.freeze(ROUTE.map((stop) => Object.freeze({
  ...stop,
  stopAudio: stop.id === 1 ? './audio/stop-1-web.mp3' : `./audio/stop-${stop.id}.mp3`,
  transitionAudio: stop.id < 8 ? `./audio/transition-${stop.id}.mp3` : null,
})));

