import { splitIntoBatches } from './splitIntoBatches.js';
import { buildTopicTree } from './buildTopicTree.js';
import { enforceMaxBatchSize } from './batchUtils.js';
import { deriveBatchState, migrateCardState } from './progressUtils.js';

export function makeDeck(id, title, cards, progress, topicProgress = {}, batchNames = []) {
  let batches;
  let processedCards = cards;
  const hasExplicit = cards.some(c => typeof c.batchIndex === 'number');
  if (hasExplicit) {
    processedCards = enforceMaxBatchSize(cards);
    const groups = {};
    for (const card of processedCards) {
      const idx = typeof card.batchIndex === 'number' ? card.batchIndex : 0;
      if (!groups[idx]) groups[idx] = [];
      groups[idx].push(card);
    }
    batches = Object.keys(groups).map(Number).sort((a, b) => a - b).map(k => groups[k]);
  } else {
    batches = splitIntoBatches(cards);
  }

  // Migrate flat-mode cards that lack learningState, inferring from old batch status.
  // Skip topic-mode cards — those are migrated in buildTopicTree per node.
  const isTopicMode = processedCards.some(c => c.topic);
  if (!isTopicMode) {
    for (let i = 0; i < batches.length; i++) {
      const oldStatus = progress?.batches?.[i]?.status ?? 'unseen';
      for (const card of batches[i]) {
        migrateCardState(card, oldStatus);
      }
    }
  }

  // Recompute highestUnlockedBatch from current card states so migration is reflected.
  let computedHob = progress?.highestUnlockedBatch ?? 0;
  for (let i = 0; i < batches.length; i++) {
    const bs = deriveBatchState(batches[i]);
    if ((bs === 'learned' || bs === 'mastered') && i + 1 < batches.length) {
      computedHob = Math.max(computedHob, i + 1);
    }
  }

  // Per-batch progress: only lastStudied is stored; status is derived at render time.
  const batchProgress = batches.map((_, i) => ({
    lastStudied: progress?.batches?.[i]?.lastStudied ?? null,
  }));

  const topicTree = buildTopicTree(processedCards, topicProgress);
  const hasTopics = topicTree.length > 0;
  const liveTopicProgress = {};
  if (hasTopics) collectProgress(topicTree, liveTopicProgress);

  return {
    id,
    title,
    cards: processedCards,
    batches,
    batchNames,
    progress: {
      highestUnlockedBatch: computedHob,
      deckComplete: progress?.deckComplete ?? false,
      batches: batchProgress,
    },
    topicTree,
    hasTopics,
    topicProgress: liveTopicProgress,
  };
}

function collectProgress(nodes, map) {
  for (const node of nodes) {
    if (node.directCards.length > 0 && node.progress) {
      map[node.pathKey] = node.progress;
    }
    if (node.children.length > 0) {
      collectProgress(node.children, map);
    }
  }
}
