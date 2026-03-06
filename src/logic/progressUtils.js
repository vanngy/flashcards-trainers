export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Derive batch state from the learningState of its cards.
// 'unseen' < 'in-progress' < 'learned' < 'mastered'
export function deriveBatchState(cards) {
  if (!cards || cards.length === 0) return 'unseen';
  const states = cards.map(c => c.learningState ?? 'unseen');
  if (states.every(s => s === 'unseen')) return 'unseen';
  if (states.every(s => s === 'mastered')) return 'mastered';
  if (states.every(s => s === 'learned' || s === 'mastered')) return 'learned';
  return 'in-progress';
}

// Apply one session's outcome to a card, mutating it in place.
// outcome: 'strong' | 'weak' | 'failed'
// Promotion: in-progress → learned at consecutiveStrong 2; learned → mastered at consecutiveStrong 2.
// Demotion:  weak at mastered → learned; failed at learned|mastered → in-progress.
// Promotion thresholds:
//   in-progress → learned:  1 consecutive strong  (one clean session = good enough to move on)
//   learned     → mastered: 2 consecutive strong  (sustained clean performance = genuinely stable)
export function applyCardOutcome(card, outcome, today) {
  // First encounter: transition from unseen to in-progress, then fall through.
  if ((card.learningState ?? 'unseen') === 'unseen') {
    card.learningState = 'in-progress';
    card.consecutiveStrong = 0;
  }

  const current = card.learningState;

  if (outcome === 'strong') {
    card.consecutiveStrong = (card.consecutiveStrong ?? 0) + 1;
    if (current === 'in-progress' && card.consecutiveStrong >= 1) {
      card.learningState = 'learned';
      card.consecutiveStrong = 0;
      card.learnedAt = today;
    } else if (current === 'learned' && card.consecutiveStrong >= 2) {
      card.learningState = 'mastered';
      card.consecutiveStrong = 0;
      card.masteredAt = today;
    } else if (current === 'mastered') {
      card.consecutiveStrong = Math.min(card.consecutiveStrong, 2);
    }
  } else if (outcome === 'weak') {
    card.consecutiveStrong = 0;
    if (current === 'mastered') {
      card.learningState = 'learned';
    }
    // in-progress or learned: streak reset, no state change
  } else {
    // failed
    card.consecutiveStrong = 0;
    if (current === 'learned' || current === 'mastered') {
      card.learningState = 'in-progress';
    }
  }
}

// Compute the highest accessible batch index purely from current batch states.
// Batch 0 is always accessible. Each subsequent batch is accessible only if the
// previous batch is 'learned' or 'mastered'. This is fully derived — no stored flag needed.
export function computeEffectiveUnlocked(batchStates) {
  let last = 0;
  for (let i = 1; i < batchStates.length; i++) {
    if (batchStates[i - 1] === 'learned' || batchStates[i - 1] === 'mastered') {
      last = i;
    } else {
      break;
    }
  }
  return last;
}

// Returns the batch index to continue with for a flat deck, following priority:
// 1. First accessible batch not yet learned
// 2. First accessible learned-but-not-mastered batch (reinforcement)
// 3. null if all accessible batches are mastered
export function findContinueBatch(deck) {
  const batchStates = deck.batches.map(b => deriveBatchState(b));
  return findContinueBatchIn(deck.batches, batchStates, computeEffectiveUnlocked(batchStates));
}

// Same logic for a topic-mode node
export function findContinueBatchForNode(node) {
  const batchStates = node.batches.map(b => deriveBatchState(b));
  return findContinueBatchIn(node.batches, batchStates, computeEffectiveUnlocked(batchStates));
}

function findContinueBatchIn(batches, batchStates, highestUnlocked) {
  for (let i = 0; i <= highestUnlocked && i < batches.length; i++) {
    if (batchStates[i] !== 'learned' && batchStates[i] !== 'mastered') return i;
  }
  for (let i = 0; i <= highestUnlocked && i < batches.length; i++) {
    if (batchStates[i] === 'learned') return i;
  }
  return null;
}

// Migrate a card that lacks learningState, inferring from old batch status string.
export function migrateCardState(card, oldBatchStatus) {
  if (card.learningState !== undefined) return;
  card.learningState =
    oldBatchStatus === 'mastered'    ? 'mastered' :
    oldBatchStatus === 'in-progress' ? 'in-progress' : 'unseen';
  card.consecutiveStrong = 0;
}
