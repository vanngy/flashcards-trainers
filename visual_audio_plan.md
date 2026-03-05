# Visual Polish Plan — Flashcard Trainer
*Audio deferred. All other decisions confirmed.*

---

## Colour Token Changes

| Token | Old | New |
|---|---|---|
| `--accent` | `#4f8ef7` | `#3b82f6` (deeper blue, option B) |
| `--accent-mastered` | — | `#1B5E36` (dark hunter green) |
| `--error-light` | `#fce8e8` | `#ffeaea` (full pink-red for wrong state) |

Everything else — layout, font, card shape, spacing — **unchanged**.

---

## Features

### 1. Mastered Pill → Dark Hunter Green
Batch pills keep their current shape. The `--mastered` variant gets `#1B5E36` border + text, with a light green background tint.

### 2. Wrong Answer: Wiggle + Red + 5-Second Lock
1. Card gets `.card--wrong` → full red border + `#ffeaea` bg + CSS wiggle shake (~500ms)
2. Submit button disabled with countdown: **"Wait 4… 3… 2… 1…"**
3. After 5s: red fades, button re-enables, textarea clears + refocuses

---

## Files to Change

| File | Change |
|---|---|
| [src/style.css](file:///Users/van/Library/Mobile%20Documents/com~apple~CloudDocs/University/Flashcards/src/style.css) | New token values, `wiggle` keyframe, green mastered pill |
| [src/components/AnswerInput.js](file:///Users/van/Library/Mobile%20Documents/com~apple~CloudDocs/University/Flashcards/src/components/AnswerInput.js) | 5-second countdown + disable logic |
| [src/components/BatchProgress.js](file:///Users/van/Library/Mobile%20Documents/com~apple~CloudDocs/University/Flashcards/src/components/BatchProgress.js) | Green mastered pill class |
| [src/pages/StudyView.js](file:///Users/van/Library/Mobile%20Documents/com~apple~CloudDocs/University/Flashcards/src/pages/StudyView.js) | Pass wrong-answer state to trigger card class |

---

## Verification
1. `npx serve .`, open `localhost:3000`
2. Wrong answer → card shakes red → countdown → recovers after 5s
3. Mastered batch pill → dark green `#1B5E36`
4. Blue accent updated on buttons + focus rings
