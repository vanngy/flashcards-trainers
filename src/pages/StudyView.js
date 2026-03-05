function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

import { StudyCard } from '../components/StudyCard.js';
import { AnswerInput } from '../components/AnswerInput.js';
import { RewritePrompt } from '../components/RewritePrompt.js';
import { RoundSummary } from '../components/RoundSummary.js';
import { getCurrentCard, submitAnswer, markCorrect, getSessionSummary } from '../logic/studySession.js';
import { saveToStorage } from '../storage.js';

export function StudyView(state, navigate) {
  const session = state.session;
  if (!session) {
    navigate('home', {});
    return { html: '', bind() {} };
  }

  // ── Round summary screen ──────────────────────────────────────────────────
  if (session.showRoundSummary) {
    const rs = RoundSummary({ lastRoundResult: session.lastRoundResult });
    return {
      html: `<div class="page-study">${rs.html}</div>`,
      bind(root, renderApp) {
        rs.bind(root, () => {
          const deck = session.deck;
          const batchEntry = deck.progress.batches[session.batchIndex];
          batchEntry.lastStudied = todayStr();
          if (session.lastRoundResult.batchUnlocked) {
            batchEntry.status = 'mastered';
            if (!session.lastRoundResult.deckComplete) {
              deck.progress.highestUnlockedBatch = Math.max(
                deck.progress.highestUnlockedBatch,
                session.batchIndex + 1,
              );
            } else {
              deck.progress.deckComplete = true;
            }
            saveToStorage(state);
            state.session = null;
            navigate('deck', { deckId: session.deckId });
          } else {
            batchEntry.status = 'in-progress';
            saveToStorage(state);
            session.showRoundSummary = false;
            renderApp();
          }
        });
      },
    };
  }

  // ── Active study screen ───────────────────────────────────────────────────
  const card = getCurrentCard(session);
  const summary = getSessionSummary(session);

  // Find card's index in the live deck so the edit page can locate it
  const liveDeck = state.decks.find(d => d.id === session.deckId);
  const deckCardIndex = liveDeck?.cards.findIndex(c =>
    c === card || (c.front === card.front && c.back === card.back)
  ) ?? -1;

  const streakHtml = summary.phase === 'mastery'
    ? `<div class="streak-display">Mastery streak: ${summary.cleanStreak}/2</div>`
    : '';

  const headerHtml = `
    <div class="study-nav">
      <button class="back-btn">&#8592; Back to Deck</button>
      <div class="study-nav__right">
        ${deckCardIndex >= 0 ? `<button class="btn btn--ghost study-edit-btn">Edit card</button>` : ''}
        ${streakHtml}
      </div>
    </div>
  `;

  const isWrong = !session.rewriteMode && !!session.feedback;
  const sc = StudyCard({ card, summary, wrong: isWrong });

  // ── Rewrite mode ──────────────────────────────────────────────────────────
  if (session.rewriteMode) {
    const rp = RewritePrompt({ correctAnswer: card.back, feedback: session.feedback });
    return {
      html: `<div class="page-study">${headerHtml}${sc.html}${rp.html}</div>`,
      bind(root, renderApp) {
        root.querySelector('.back-btn').addEventListener('click', () => {
          state.session = null;
          navigate('deck', { deckId: session.deckId });
        });
        root.querySelector('.study-edit-btn')?.addEventListener('click', () =>
          navigate('cardEditor', { deckId: session.deckId, cardIndex: deckCardIndex })
        );
        rp.bind(root, typed => {
          submitAnswer(session, typed);
          renderApp();
        });
      },
    };
  }

  // ── Normal answer input ───────────────────────────────────────────────────
  const ai = AnswerInput({ feedback: session.feedback });
  return {
    html: `<div class="page-study">${headerHtml}${sc.html}${ai.html}</div>`,
    bind(root, renderApp) {
      root.querySelector('.back-btn').addEventListener('click', () => {
        state.session = null;
        navigate('deck', { deckId: session.deckId });
      });
      root.querySelector('.study-edit-btn')?.addEventListener('click', () =>
        navigate('cardEditor', { deckId: session.deckId, cardIndex: deckCardIndex })
      );
      ai.bind(
        root,
        typed => { submitAnswer(session, typed); renderApp(); },
        () => { markCorrect(session); renderApp(); },
      );
    },
  };
}
