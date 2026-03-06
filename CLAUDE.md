# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Technical overview

**No build step.** Pure vanilla JS ES modules. Open `index.html` directly in a browser, or run a local server:

```bash
npx serve .
# or
python3 -m http.server
```

**No framework.** Every page and component follows a single render contract:

```js
function MyComponent(props) {
  return {
    html: `<div>...</div>`,   // rendered by innerHTML
    bind(root, renderApp) {   // called after innerHTML; attach event listeners here
      root.querySelector('button').addEventListener('click', ...);
    },
  };
}
```

---

## Architecture

### Routing and state (`src/App.js`)
- Single global `state` object: `{ currentView, routeParams, decks, session, sync, syncActions }`
- `navigate(view, params)` sets `state.currentView` + `state.routeParams`, then calls `renderApp()`
- `renderApp()` calls the current page function and sets `container.innerHTML`
- Views: `home`, `deck`, `study`, `topicEditor`, `batchEditor`, `cardEditor`
- `app--wide` CSS class is toggled on `#app` when in deck (topic mode), topicEditor, or batchEditor views
- A hardcoded starter deck (`deck_globalization`) is seeded on first load and includes an upgrade path for stored decks missing topic fields

### Persistence (`src/storage.js`)
- All state serialized to `localStorage` under key `'flashcard_trainer'`
- `saveToStorage(state, { triggerSync })` / `loadFromStorage()` — called explicitly after mutations
- Only `id`, `title`, `cards`, `progress`, `topicProgress`, `batchNames` are persisted; `batches`, `topicTree`, etc. are recomputed by `makeDeck()` on load
- `serializeState(state)` — extracts the persistable shape; used by both localStorage and Gist sync
- Sync config (token + gistId) stored separately under `'flashcard_sync'`

### GitHub Gist sync (`src/sync.js`)
Cross-device sync via a personal GitHub Gist. `state.sync = { status: 'idle'|'ok'|'error', message }` reflects current sync state. `state.syncActions.connect(token)` and `state.syncActions.disconnect()` manage the connection. On startup, if a token+gistId are stored, the app pulls from the Gist and merges. After each `saveToStorage`, a debounced push (3 s) writes to the Gist. Pass `{ triggerSync: false }` to `saveToStorage` to suppress the push (used when applying incoming Gist data).

### Deck data model (`src/logic/makeDeck.js`)
`makeDeck(id, title, cards, progress, topicProgress, batchNames)` returns a deck object. Two modes:

| Mode | When | Batching |
|------|------|----------|
| **Flat** | Cards have no `topic` field | `splitIntoBatches` (chunks of 5 in order) |
| **Topic** | Cards have `topic` field | `buildTopicTree` groups cards by topic/subtopic/subsubtopic, then batches within each leaf node |

If any card has a numeric `batchIndex` field, explicit batching is used instead; `enforceMaxBatchSize` ensures no batch exceeds 5.

Card fields: `front`, `back`, `topic?`, `subtopic?`, `subsubtopic?`, `batchIndex?`

### Topic tree (`src/logic/buildTopicTree.js`)
Builds a tree of nodes from card `topic` / `subtopic` / `subsubtopic` fields. Each leaf node (one with `directCards`) has its own `batches` and `progress`. The `ColumnBrowser` component (`src/components/ColumnBrowser.js`) renders this tree. `slugify()` is exported from this file and used elsewhere.

### Batch utilities (`src/logic/batchUtils.js`)
- `enforceMaxBatchSize(cards)` — splits oversized batches, renumbers `batchIndex` fields
- `findNode(nodes, pathKey)` — recursive tree search
- `cardPathKey(card)` — builds a `/`-separated slug path from a card's topic fields
- `currentBatchOf(card, deckCardIndex, deck)` / `batchCountFor(card, deck)` — batch lookup helpers used in editors
- `batchOptionsHtml(card, cardIndex, deck)` — renders `<option>` elements for batch selectors in editors

### Card learning state (`src/logic/progressUtils.js`)
Progress is tracked **per card** via a `learningState` field mutated in place on the card object:

`unseen → in-progress → learned → mastered`

- `applyCardOutcome(card, outcome, today)` — transitions card state based on `outcome: 'strong' | 'weak' | 'failed'`
  - `strong`: increments `consecutiveStrong`; promotes `in-progress → learned` at 1, `learned → mastered` at 2
  - `weak`: resets streak; demotes `mastered → learned`
  - `failed`: resets streak; demotes `learned | mastered → in-progress`
- `deriveBatchState(cards)` — derives `'unseen' | 'in-progress' | 'learned' | 'mastered'` from a batch's cards (batch status is never stored directly)
- `computeEffectiveUnlocked(batchStates)` — batch N unlocks when batch N-1 is `learned` or `mastered`
- `findContinueBatch(deck)` / `findContinueBatchForNode(node)` — returns the batch index to study next (first non-learned, then first learned-not-mastered, then null)

### Progress object structure
Stored on each deck at `deck.progress`:
```js
{
  highestUnlockedBatch: 0,   // floor for unlock (real unlock derived from card states)
  deckComplete: false,
  batches: []                // legacy; batch state is derived via deriveBatchState()
}
```
Card fields added at runtime (persisted on `d.cards`): `learningState`, `consecutiveStrong`, `learnedAt?`, `masteredAt?`

`topicProgress` (persisted separately) maps `pathKey → { highestUnlockedBatch, deckComplete }` for topic-mode nodes.

### Study session (`src/logic/studySession.js`)
In-memory state machine passed through `state.session`. Key functions:
- `createSession(studyTarget, batchIndex, deckId)` — `studyTarget` is either a deck or a topic-tree node (both have `.batches`)
- `submitAnswer(session, typed)` — returns `{ correct, rewriteTriggered, roundComplete, batchUnlocked }`. On 1st/2nd wrong: sets `showSolution = true`, records outcome `'weak'`. On **3rd wrong**: sets `rewriteMode = true`, records `'failed'`.
- `continueSolution(session)` — clears `showSolution` without advancing card (user retries same card)
- `markCorrect(session)` — typo-forgiveness: advances card as `'strong'` regardless of prior wrongs
- `getSessionSummary(session)` — returns `{ batchIndex, cardIndex, totalCards }`

Each card's outcome (`'strong'` by default, `'weak'`, or `'failed'`) is tracked in `session.cardOutcomes` (Map). On round complete, `applyCardOutcome` is called for every card, mutating `learningState` in place, then `saveToStorage` is called by the caller.

### Answer checking (`src/logic/checkAnswer.js`)
Strips punctuation/symbols (`[^\p{L}\p{N}\s]`) and collapses whitespace before comparing. Case-sensitive.
> Note: this diverges from the spec's "exact match" — punctuation and extra whitespace are forgiven.

### CSV format (`src/logic/parseCsv.js`)
Two accepted formats:
- **2-column**: `front,back`
- **5-column topic**: `topic,subtopic,subsubtopic,front,back`

UTF-8 BOM is stripped automatically. Multi-line quoted fields are supported. Also exports `exportDeckAsCsv(deck)` which triggers a file download.

### PWA
`sw.js` is a cache-first service worker that caches all app assets under `flashcard-trainer-v{N}`. Bump the version constant when adding new files to the asset list.

### Utilities
- `src/utils.js` — exports `escapeHtml(str)` for safe HTML insertion

### DeckView routing (`src/pages/DeckView.js`)
Two render paths:
- **Topic path**: shows `ColumnBrowser` for navigating the tree; "Edit cards" opens `topicEditor`
- **Flat path**: shows `BatchProgress` component; "Edit batches" opens `batchEditor`, "Edit cards" opens `topicEditor`
