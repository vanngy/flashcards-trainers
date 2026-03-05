# Flashcard Trainer

A browser-based flashcard trainer for practising exact written recall. No login, no server — runs entirely in the browser with progress saved to `localStorage`.

**[Live demo →](https://vanngy.github.io/tinycards-replication)**

---

## How it works

1. **Import a deck** — upload a CSV file
2. **Study in batches** — cards are split into groups of 5
3. **Type the answer exactly** — the app checks your input verbatim
4. **Unlock the next batch** — complete 2 clean rounds in a row to advance

### Answer rules
- 2 normal attempts per card
- After 2 wrong attempts: rewrite mode — the correct answer is shown at low opacity and you must type it out
- A round is "clean" only if every card was answered correctly on the first or second attempt (no rewrites)
- 2 consecutive clean rounds unlock the next batch

---

## CSV format

Two formats are supported:

**Simple (2 columns)**
```
front,back
What is photosynthesis?,The process by which plants convert light into energy
```

**Topic (5 columns)**
```
topic,subtopic,subsubtopic,front,back
Chapter 1,Section 1.1,,What is X?,The definition of X
Chapter 1,Section 1.2,1.2.1 Detail,What is Y?,The definition of Y
```

Topic decks unlock a column browser with sequential gating — each topic/subtopic is locked until the previous sibling is fully mastered.

---

## Running locally

No build step. Open `index.html` directly or serve with:

```bash
npx serve .
# or
python3 -m http.server
```

---

## Project structure

```
src/
  components/     UI components (BatchProgress, ColumnBrowser, …)
  logic/          Pure functions (parseCsv, studySession, checkAnswer, …)
  pages/          Page renderers (Home, DeckView, StudyView, …)
  App.js          Router and global state
  storage.js      localStorage persistence
index.html
```

---

## Tech

Vanilla JS ES modules. No framework, no build tool, no dependencies.
