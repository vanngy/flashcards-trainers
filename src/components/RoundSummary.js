// Session summary displayed after each batch session.
// lastRoundResult = { cardDiffs, batchUnlocked, deckComplete, batchState }
// cardDiffs = [{ card, previousState, newState, outcome }]
// nextBatchLabel: string like "Batch 3" if a new batch is available, otherwise null
// bind(root, { onRepeat, onProceed, onBack })
export function RoundSummary({ lastRoundResult, nextBatchLabel }) {
  const { cardDiffs, batchUnlocked, deckComplete } = lastRoundResult;

  const stateOrder = s => ({ unseen: 0, 'in-progress': 1, learned: 2, mastered: 3 }[s] ?? 0);

  const promoted     = cardDiffs.filter(d => stateOrder(d.newState) > stateOrder(d.previousState));
  const demoted      = cardDiffs.filter(d => stateOrder(d.newState) < stateOrder(d.previousState));
  const streakReset  = cardDiffs.filter(d =>
    d.outcome !== 'strong' &&
    d.newState === d.previousState &&
    d.previousState !== 'unseen'
  );
  const unchanged    = cardDiffs.filter(d =>
    d.outcome === 'strong' &&
    d.newState === d.previousState &&
    d.previousState !== 'unseen'
  );
  const firstEncounter = cardDiffs.filter(d => d.previousState === 'unseen');

  const movedToMastered  = promoted.filter(d => d.newState === 'mastered');
  const movedToLearned   = promoted.filter(d => d.newState === 'learned');
  const droppedToInProg  = demoted.filter(d => d.newState === 'in-progress');
  const slippedToLearned = demoted.filter(d => d.newState === 'learned');

  function line(cls, symbol, count, label) {
    if (!count) return '';
    const s = count !== 1 ? 's' : '';
    return `<div class="summary-line summary-line--${cls}">${symbol} ${count} card${s} ${label}</div>`;
  }

  const linesHtml = [
    line('up',      '↑', movedToMastered.length,  'moved to mastered'),
    line('up',      '↑', movedToLearned.length,   'moved to learned'),
    line('down',    '↓', droppedToInProg.length,  'dropped to in progress'),
    line('slip',    '↓', slippedToLearned.length, 'slipped from mastered to learned'),
    line('reset',   '∼', streakReset.length,      'had streak reset'),
    line('neutral', '→', unchanged.length,         'unchanged'),
    line('neutral', '→', firstEncounter.length,    'encountered for the first time'),
  ].join('');

  const learnedCount = cardDiffs.filter(d =>
    d.newState === 'learned' || d.newState === 'mastered'
  ).length;
  const total = cardDiffs.length;

  const noticeHtml = [
    deckComplete ? `<p class="unlock-msg">All cards learned — deck complete!</p>` : '',
    batchUnlocked && !deckComplete ? `<p class="unlock-msg">Next batch unlocked!</p>` : '',
  ].join('');

  const buttonsHtml = nextBatchLabel
    ? `
      <button class="btn btn--primary btn--full proceed-btn">Proceed — ${nextBatchLabel}</button>
      <button class="btn btn--secondary btn--full repeat-btn">Repeat this batch</button>
    `
    : `
      <button class="btn btn--primary btn--full back-btn">Back to Deck</button>
      <button class="btn btn--secondary btn--full repeat-btn">Repeat this batch</button>
    `;

  return {
    html: `
      <div class="card round-summary fade-in">
        <h2>Session complete</h2>
        <div class="summary-lines">${linesHtml}</div>
        <p class="round-summary__batch-status">${learnedCount} of ${total} card${total !== 1 ? 's' : ''} learned</p>
        ${noticeHtml}
        ${buttonsHtml}
      </div>
    `,
    bind(root, { onRepeat, onProceed, onBack }) {
      root.querySelector('.repeat-btn').addEventListener('click', onRepeat);
      root.querySelector('.proceed-btn')?.addEventListener('click', onProceed);
      root.querySelector('.back-btn')?.addEventListener('click', onBack);
    },
  };
}
