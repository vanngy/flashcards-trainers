import { checkAnswer } from './checkAnswer.js';
import { applyCardOutcome, deriveBatchState, todayStr } from './progressUtils.js';

// createSession — initialise a fresh in-memory session for one batch
export function createSession(studyTarget, batchIndex, deckId) {
  const originalBatch = studyTarget.batches[batchIndex];
  return {
    deck: studyTarget,
    deckId: deckId ?? studyTarget.id,
    batchIndex,
    originalBatch,
    batch: originalBatch,
    cardIndex: 0,
    attemptCount: 0,    // wrong attempts on current card this cycle
    rewriteMode: false,
    showSolution: false,
    lastTyped: null,
    cardOutcomes: new Map(),  // card → 'strong' | 'weak' | 'failed'
    showRoundSummary: false,
    lastRoundResult: null,
    feedback: null,
  };
}

// getCurrentCard — returns the active card, or null if session is done
export function getCurrentCard(session) {
  if (session.cardIndex >= session.batch.length) return null;
  return session.batch[session.cardIndex];
}

// submitAnswer — core answer-handling state machine
// Returns { correct, rewriteTriggered, roundComplete, batchUnlocked }
export function submitAnswer(session, typed) {
  const card = session.batch[session.cardIndex];
  const correct = checkAnswer(typed, card.back);
  const result = { correct, rewriteTriggered: false, roundComplete: false, batchUnlocked: false };

  if (session.rewriteMode) {
    if (correct) {
      session.rewriteMode = false;
      session.attemptCount = 0;
      session.feedback = null;
      advanceCard(session, result);
    }
    // wrong in rewrite mode: stay in rewrite silently
  } else {
    if (correct) {
      session.feedback = null;
      session.attemptCount = 0;
      advanceCard(session, result);
    } else {
      session.attemptCount++;
      session.lastTyped = typed;
      if (session.attemptCount >= 3) {
        // 3rd wrong: enter rewrite mode, mark as failed
        session.rewriteMode = true;
        session.feedback = null;
        result.rewriteTriggered = true;
        session.cardOutcomes.set(card, 'failed');
      } else {
        // 1st or 2nd wrong: show solution
        session.showSolution = true;
        if (session.cardOutcomes.get(card) !== 'failed') {
          session.cardOutcomes.set(card, 'weak');
        }
      }
    }
  }

  return result;
}

// continueSolution — called when user presses Continue after viewing solution
export function continueSolution(session) {
  session.showSolution = false;
  // cardIndex is NOT advanced — user retries the same card
}

function advanceCard(session, result) {
  session.cardIndex++;
  if (session.cardIndex >= session.batch.length) {
    result.roundComplete = true;
    completeSession(session, result);
  }
}

function completeSession(session, result) {
  const today = todayStr();
  const cardDiffs = [];

  for (const card of session.originalBatch) {
    const previousState = card.learningState ?? 'unseen';
    const outcome = session.cardOutcomes.get(card) ?? 'strong';
    applyCardOutcome(card, outcome, today);
    cardDiffs.push({ card, previousState, newState: card.learningState, outcome });
  }

  // Update stored highestUnlockedBatch (used as a floor; display is derived from card states).
  const batchState = deriveBatchState(session.originalBatch);
  if (batchState === 'learned' || batchState === 'mastered') {
    const prog = session.deck.progress;
    const hasNext = session.batchIndex + 1 < session.deck.batches.length;
    if (hasNext) {
      prog.highestUnlockedBatch = Math.max(prog.highestUnlockedBatch, session.batchIndex + 1);
    }
    result.batchUnlocked = true;
  }

  // Check deck learning complete (all batches learned or mastered)
  const allLearned = session.deck.batches.every(b => {
    const bs = deriveBatchState(b);
    return bs === 'learned' || bs === 'mastered';
  });
  if (allLearned) {
    session.deck.progress.deckComplete = true;
    result.deckComplete = true;
  }

  session.showRoundSummary = true;
  session.lastRoundResult = {
    cardDiffs,
    batchUnlocked: result.batchUnlocked || false,
    deckComplete: result.deckComplete || false,
    batchState,
  };
}

// markCorrect — typo forgiveness: treat the current card as strongly correct.
// Clears any weak/failed outcome recorded so far for this card.
export function markCorrect(session) {
  const card = session.batch[session.cardIndex];
  session.cardOutcomes.delete(card);  // revert to default 'strong'
  session.rewriteMode = false;
  session.showSolution = false;
  session.lastTyped = null;
  session.attemptCount = 0;
  session.feedback = null;
  const result = { correct: true, rewriteTriggered: false, roundComplete: false, batchUnlocked: false };
  advanceCard(session, result);
  return result;
}

export function getSessionSummary(session) {
  return {
    batchIndex: session.batchIndex,
    cardIndex: session.cardIndex,
    totalCards: session.batch.length,
  };
}
