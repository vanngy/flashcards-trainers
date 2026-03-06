const CACHE = 'flashcard-trainer-v13';

const ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'icon.svg',
  'src/style.css',
  'src/App.js',
  'src/storage.js',
  'src/sync.js',
  'src/utils.js',
  'src/logic/checkAnswer.js',
  'src/logic/progressUtils.js',
  'src/logic/studySession.js',
  'src/logic/splitIntoBatches.js',
  'src/logic/parseCsv.js',
  'src/logic/makeDeck.js',
  'src/logic/batchUtils.js',
  'src/logic/buildTopicTree.js',
  'src/pages/Home.js',
  'src/pages/DeckView.js',
  'src/pages/StudyView.js',
  'src/pages/TopicEditor.js',
  'src/pages/BatchEditor.js',
  'src/pages/CardEditor.js',
  'src/components/StudyCard.js',
  'src/components/AnswerInput.js',
  'src/components/RewritePrompt.js',
  'src/components/WrongAnswer.js',
  'src/components/RoundSummary.js',
  'src/components/BatchProgress.js',
  'src/components/DeckImporter.js',
  'src/components/DeckList.js',
  'src/components/ColumnBrowser.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
