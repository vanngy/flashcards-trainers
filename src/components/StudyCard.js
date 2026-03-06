import { escapeHtml } from '../utils.js';

// Renders the card front + batch/card metadata.
// summary = { batchIndex, cardIndex, totalCards }
export function StudyCard({ card, summary, wrong = false }) {
  const batchLabel = `Batch ${summary.batchIndex + 1}`;
  const cardLabel = `Card ${summary.cardIndex + 1} of ${summary.totalCards}`;
  const wrongClass = wrong ? ' card--wrong' : '';

  return {
    html: `
      <div class="study-card__meta">${batchLabel} · ${cardLabel}</div>
      <div class="card study-card fade-in${wrongClass}">
        <div class="study-card__front">${escapeHtml(card.front)}</div>
      </div>
    `,
    bind() {},
  };
}
