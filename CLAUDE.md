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
- Single global `state` object: `{ currentView, routeParams, decks, session }`
- `navigate(view, params)` sets `state.currentView` + `state.routeParams`, then calls `renderApp()`
- `renderApp()` calls the current page function and sets `container.innerHTML`
- Views: `home`, `deck`, `study`, `topicEditor`, `batchEditor`, `cardEditor`
- `app--wide` CSS class is toggled on `#app` when in deck (topic mode), topicEditor, or batchEditor views
- A hardcoded starter deck (`deck_globalization`) is seeded on first load and includes an upgrade path for stored decks missing topic fields

### Persistence (`src/storage.js`)
- All state serialized to `localStorage` under key `'flashcard_trainer'`
- `saveToStorage(state)` / `loadFromStorage()` — called explicitly after mutations
- Only `id`, `title`, `cards`, `progress`, `topicProgress`, `batchNames` are persisted; `batches`, `topicTree`, etc. are recomputed by `makeDeck()` on load

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

### Study session (`src/logic/studySession.js`)
In-memory state machine passed through `state.session`. Key functions:
- `createSession(studyTarget, batchIndex, deckId)` — `studyTarget` is either a deck or a topic-tree node (both have `.batches`)
- `submitAnswer(session, typed)` — returns `{ correct, rewriteTriggered, roundComplete, batchUnlocked }`
- `markCorrect(session)` — typo-forgiveness: advances card as correct without setting `isRoundClean = false` (round stays clean, no rewrite flag)

Session phases: `'initial'` (first pass through batch) → `'mastery'` (requires 2 clean rounds to unlock next batch). A round is clean only if no card triggered rewrite mode.

### Answer checking (`src/logic/checkAnswer.js`)
Strips punctuation/symbols (`[^\p{L}\p{N}\s]`) and collapses whitespace before comparing. Case-sensitive.
> Note: this diverges from the spec's "exact match" — punctuation and extra whitespace are forgiven.

### CSV format (`src/logic/parseCsv.js`)
Two accepted formats:
- **2-column**: `front,back`
- **5-column topic**: `topic,subtopic,subsubtopic,front,back`

UTF-8 BOM is stripped automatically. Multi-line quoted fields are supported. Also exports `exportDeckAsCsv(deck)` which triggers a file download.

### Utilities
- `src/utils.js` — exports `escapeHtml(str)` for safe HTML insertion

### DeckView routing (`src/pages/DeckView.js`)
Two render paths:
- **Topic path**: shows `ColumnBrowser` for navigating the tree; "Edit cards" opens `topicEditor`
- **Flat path**: shows `BatchProgress` component; "Edit batches" opens `batchEditor`, "Edit cards" opens `topicEditor`
