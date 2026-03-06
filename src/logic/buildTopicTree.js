import { splitIntoBatches } from './splitIntoBatches.js';
import { deriveBatchState, migrateCardState } from './progressUtils.js';

export function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function buildTopicTree(cards, topicProgressMap = {}) {
  const topicCards = cards.filter(c => c.topic);
  if (topicCards.length === 0) return [];

  const nodeMap = {};
  const roots = [];

  function getOrCreate(label, level, parentPathKey) {
    const slug = slugify(label);
    const pathKey = parentPathKey ? `${parentPathKey}/${slug}` : slug;
    if (nodeMap[pathKey]) return nodeMap[pathKey];
    const node = {
      label,
      slug,
      pathKey,
      level,
      children: [],
      directCards: [],
      batches: [],
      progress: null,
    };
    nodeMap[pathKey] = node;
    if (!parentPathKey) {
      roots.push(node);
    } else {
      nodeMap[parentPathKey].children.push(node);
    }
    return node;
  }

  // Pass 1: build tree and assign directCards to deepest node on each card's path
  for (const card of topicCards) {
    const topicNode = getOrCreate(card.topic, 0, null);
    let deepestNode = topicNode;

    if (card.subtopic) {
      const subtopicNode = getOrCreate(card.subtopic, 1, topicNode.pathKey);
      deepestNode = subtopicNode;

      if (card.subsubtopic) {
        const subsubNode = getOrCreate(card.subsubtopic, 2, subtopicNode.pathKey);
        deepestNode = subsubNode;
      }
    }

    deepestNode.directCards.push(card);
  }

  // Pass 2: attach batches + progress to every leaf node
  for (const node of Object.values(nodeMap)) {
    if (node.directCards.length === 0) continue;
    const hasExplicit = node.directCards.some(c => typeof c.batchIndex === 'number');
    if (hasExplicit) {
      const groups = {};
      node.directCards.forEach((card, idx) => {
        const bi = typeof card.batchIndex === 'number' ? card.batchIndex : Math.floor(idx / 5);
        if (!groups[bi]) groups[bi] = [];
        groups[bi].push(card);
      });
      node.batches = Object.keys(groups).map(Number).sort((a, b) => a - b).map(k => groups[k]);
    } else {
      node.batches = splitIntoBatches(node.directCards);
    }

    const saved = topicProgressMap[node.pathKey];

    // Migrate cards in this node that lack learningState
    for (let i = 0; i < node.batches.length; i++) {
      const oldStatus = saved?.batches?.[i]?.status ?? 'unseen';
      for (const card of node.batches[i]) {
        migrateCardState(card, oldStatus);
      }
    }

    // Recompute highestUnlockedBatch from current card states
    let computedHob = saved?.highestUnlockedBatch ?? 0;
    for (let i = 0; i < node.batches.length; i++) {
      const bs = deriveBatchState(node.batches[i]);
      if ((bs === 'learned' || bs === 'mastered') && i + 1 < node.batches.length) {
        computedHob = Math.max(computedHob, i + 1);
      }
    }

    node.progress = {
      highestUnlockedBatch: computedHob,
      deckComplete: saved?.deckComplete ?? false,
      batches: node.batches.map((_, i) => ({
        lastStudied: saved?.batches?.[i]?.lastStudied ?? null,
      })),
    };
  }

  return roots;
}
