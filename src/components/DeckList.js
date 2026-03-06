import { escapeHtml } from '../utils.js';

// Renders clickable deck cards.
// bind(root, onSelect) — onSelect(deckId)
export function DeckList({ decks }) {
  if (decks.length === 0) {
    return {
      html: `<p class="empty-msg">No decks yet. Import a CSV to get started.</p>`,
      bind() {},
    };
  }

  const items = decks.map(deck => {
    const total    = deck.cards.length;
    const learned  = deck.cards.filter(c => c.learningState === 'learned' || c.learningState === 'mastered').length;
    const batchLabel = deck.progress.deckComplete || learned === total && total > 0
      ? `All ${total} cards learned`
      : `${learned} / ${total} learned`;
    return `
      <li class="deck-item" data-id="${escapeHtml(deck.id)}">
        <div class="deck-item__body">
          <div class="deck-item__title">${escapeHtml(deck.title)}</div>
          <div class="deck-item__meta">${deck.cards.length} cards · ${batchLabel}</div>
        </div>
        <button class="deck-item__delete" data-id="${escapeHtml(deck.id)}" title="Delete deck">&#x2715;</button>
      </li>
    `;
  }).join('');

  return {
    html: `<ul class="deck-list">${items}</ul>`,
    bind(root, onSelect, onDelete) {
      root.querySelectorAll('.deck-item').forEach(el => {
        el.addEventListener('click', () => onSelect(el.dataset.id));
      });
      if (onDelete) {
        root.querySelectorAll('.deck-item__delete').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm(`Delete "${btn.closest('.deck-item').querySelector('.deck-item__title').textContent}"?`)) {
              onDelete(btn.dataset.id);
            }
          });
        });
      }
    },
  };
}
