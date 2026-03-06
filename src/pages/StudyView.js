import { StudyCard } from '../components/StudyCard.js';
import { AnswerInput } from '../components/AnswerInput.js';
import { RewritePrompt } from '../components/RewritePrompt.js';
import { WrongAnswer } from '../components/WrongAnswer.js';
import { RoundSummary } from '../components/RoundSummary.js';
import { getCurrentCard, submitAnswer, markCorrect, continueSolution, getSessionSummary, createSession } from '../logic/studySession.js';
import { todayStr, deriveBatchState, computeEffectiveUnlocked } from '../logic/progressUtils.js';
import { saveToStorage } from '../storage.js';

export function StudyView(state, navigate) {
  const session = state.session;
  if (!session) {
    navigate('home', {});
    return { html: '', bind() {} };
  }

  // ── Round summary screen ──────────────────────────────────────────────────
  if (session.showRoundSummary) {
    // Determine whether the next batch is available
    const nextIdx = session.batchIndex + 1;
    const hasNext = nextIdx < session.deck.batches.length;
    let nextBatchLabel = null;
    if (hasNext) {
      const batchStates = session.deck.batches.map(b => deriveBatchState(b));
      const highestUnlocked = computeEffectiveUnlocked(batchStates);
      if (nextIdx <= highestUnlocked) {
        nextBatchLabel = `Batch ${nextIdx + 1}`;
      }
    }

    const rs = RoundSummary({ lastRoundResult: session.lastRoundResult, nextBatchLabel });

    // Helper: save progress for the just-completed batch
    function saveProgress() {
      const batchEntry = session.deck.progress.batches[session.batchIndex];
      if (batchEntry) batchEntry.lastStudied = todayStr();
      saveToStorage(state);
    }

    return {
      html: `<div class="page-study">${rs.html}</div>`,
      bind(root, renderApp) {
        rs.bind(root, {
          onRepeat() {
            saveProgress();
            state.session = createSession(session.deck, session.batchIndex, session.deckId);
            renderApp();
          },
          onProceed() {
            saveProgress();
            state.session = createSession(session.deck, nextIdx, session.deckId);
            renderApp();
          },
          onBack() {
            saveProgress();
            state.session = null;
            navigate('deck', { deckId: session.deckId });
          },
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

  const headerHtml = `
    <div class="study-nav">
      <button class="back-btn">&#8592; Back to Deck</button>
      <div class="study-nav__right">
        ${deckCardIndex >= 0 ? `<button class="btn btn--ghost study-edit-btn">Edit card</button>` : ''}
      </div>
    </div>
  `;

  const sc = StudyCard({ card, summary, wrong: false });

  // ── Show solution after wrong answer (1st / 2nd attempt) ─────────────────
  if (session.showSolution) {
    const wa = WrongAnswer({ correctAnswer: card.back, typedAnswer: session.lastTyped });
    return {
      html: `<div class="page-study">${headerHtml}${sc.html}${wa.html}</div>`,
      bind(root, renderApp) {
        root.querySelector('.back-btn').addEventListener('click', () => {
          state.session = null;
          navigate('deck', { deckId: session.deckId });
        });
        root.querySelector('.study-edit-btn')?.addEventListener('click', () =>
          navigate('cardEditor', { deckId: session.deckId, cardIndex: deckCardIndex, fromStudy: true, batchIndex: session.batchIndex })
        );
        wa.bind(
          root,
          () => { continueSolution(session); renderApp(); },
          () => { markCorrect(session); renderApp(); },
        );
      },
    };
  }

  // ── Rewrite mode (3rd wrong attempt) ─────────────────────────────────────
  if (session.rewriteMode) {
    const rp = RewritePrompt({ correctAnswer: card.back });
    return {
      html: `<div class="page-study">${headerHtml}${sc.html}${rp.html}</div>`,
      bind(root, renderApp) {
        root.querySelector('.back-btn').addEventListener('click', () => {
          state.session = null;
          navigate('deck', { deckId: session.deckId });
        });
        root.querySelector('.study-edit-btn')?.addEventListener('click', () =>
          navigate('cardEditor', { deckId: session.deckId, cardIndex: deckCardIndex, fromStudy: true, batchIndex: session.batchIndex })
        );
        rp.bind(
          root,
          typed => { submitAnswer(session, typed); renderApp(); },
          () => { markCorrect(session); renderApp(); },
        );
      },
    };
  }

  // ── Normal answer input ───────────────────────────────────────────────────
  const ai = AnswerInput();
  return {
    html: `<div class="page-study">${headerHtml}${sc.html}${ai.html}</div>`,
    bind(root, renderApp) {
      root.querySelector('.back-btn').addEventListener('click', () => {
        state.session = null;
        navigate('deck', { deckId: session.deckId });
      });
      root.querySelector('.study-edit-btn')?.addEventListener('click', () =>
        navigate('cardEditor', { deckId: session.deckId, cardIndex: deckCardIndex, fromStudy: true, batchIndex: session.batchIndex })
      );
      ai.bind(root, typed => { submitAnswer(session, typed); renderApp(); });
    },
  };
}
