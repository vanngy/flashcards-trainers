// Row of pills showing batch status.
// batchProgress = [{ lastStudied }] per batch
// batchStates = ['unseen'|'in-progress'|'learned'|'mastered'] — derived from card states
// highestUnlocked = highest accessible batch index
export function BatchProgress({ batches, batchProgress, batchStates, highestUnlocked, batchNames = [] }) {
  const pills = batches.map((_, i) => {
    const bp = batchProgress?.[i] || { lastStudied: null };
    const state = batchStates?.[i] ?? 'unseen';
    const isLocked = i > highestUnlocked;

    let cls = 'batch-pill';
    if      (isLocked)             cls += ' batch-pill--locked';
    else if (state === 'mastered') cls += ' batch-pill--mastered';
    else if (state === 'learned')  cls += ' batch-pill--learned';
    else                           cls += ' batch-pill--available'; // unseen + in-progress both = dark/unlocked

    const label = batchLabel(i, batchNames);
    const clickable = !isLocked ? ' batch-pill--clickable' : '';
    return `<div class="${cls}${clickable}" data-batch="${i}"><span>${label}</span></div>`;
  }).join('');

  return {
    html: `<div class="batch-progress">${pills}</div>`,
    bind(root, onBatchClick) {
      if (!onBatchClick) return;
      root.querySelectorAll('.batch-pill--clickable').forEach(pill => {
        pill.addEventListener('click', () => onBatchClick(Number(pill.dataset.batch)));
      });
    },
  };
}

function batchLabel(i, names) {
  const custom = names?.[i];
  return custom ? `Batch ${i + 1}: ${custom}` : `Batch ${i + 1}`;
}

