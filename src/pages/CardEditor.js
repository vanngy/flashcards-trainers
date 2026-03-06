import { escapeHtml as escHtml } from '../utils.js';
import { makeDeck } from '../logic/makeDeck.js';
import { saveToStorage } from '../storage.js';
import { batchOptionsHtml, currentBatchOf } from '../logic/batchUtils.js';
import { createSession } from '../logic/studySession.js';

export function CardEditor(state, navigate) {
  const { deckId, cardIndex, fromStudy, batchIndex: studyBatchIndex } = state.routeParams;
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck || cardIndex == null) { navigate('home', {}); return { html: '', bind() {} }; }

  const card = deck.cards[cardIndex];
  if (!card) { navigate('deck', { deckId }); return { html: '', bind() {} }; }

  const originalBatch = currentBatchOf(card, cardIndex, deck);

  return {
    html: `
      <div class="page-topic-editor">
        <button class="back-btn">&#8592; Back</button>
        <div class="deck-header">
          <h1>Edit Card ${cardIndex + 1}</h1>
          <p class="deck-header__meta">${escHtml(deck.title)}</p>
        </div>
        <form class="te-form" novalidate>
          <div class="te-card-row">
            <div class="te-card-row__sides">
              <label class="te-input-label">Front
                <textarea class="te-input te-textarea te-textarea--large" id="ce-front" rows="4">${escHtml(card.front)}</textarea>
              </label>
              <label class="te-input-label">Back
                <textarea class="te-input te-textarea te-textarea--large" id="ce-back" rows="5">${escHtml(card.back)}</textarea>
              </label>
            </div>
            <div class="te-card-row__topics">
              <label class="te-input-label">Topic
                <input class="te-input" id="ce-topic" type="text" value="${escHtml(card.topic || '')}" placeholder="Topic">
              </label>
              <label class="te-input-label">Subtopic
                <input class="te-input" id="ce-subtopic" type="text" value="${escHtml(card.subtopic || '')}" placeholder="Subtopic">
              </label>
              <label class="te-input-label">Sub-subtopic
                <input class="te-input" id="ce-subsubtopic" type="text" value="${escHtml(card.subsubtopic || '')}" placeholder="Sub-subtopic">
              </label>
              <label class="te-input-label">Batch
                <select class="te-input" id="ce-batch">
                  ${batchOptionsHtml(card, cardIndex, deck)}
                </select>
              </label>
            </div>
          </div>
          <div class="te-actions">
            <button type="button" class="btn btn--secondary" id="ce-cancel">Cancel</button>
            <button type="submit" class="btn btn--primary">Save card</button>
          </div>
        </form>
      </div>`,
    bind(root) {
      const goBack = () => navigate('deck', { deckId });
      root.querySelector('.back-btn').addEventListener('click', goBack);
      root.querySelector('#ce-cancel').addEventListener('click', goBack);

      root.querySelector('.te-form').addEventListener('submit', e => {
        e.preventDefault();
        const front       = root.querySelector('#ce-front').value.trim();
        const back        = root.querySelector('#ce-back').value.trim();
        const topic       = root.querySelector('#ce-topic').value.trim();
        const subtopic    = root.querySelector('#ce-subtopic').value.trim();
        const subsubtopic = root.querySelector('#ce-subsubtopic').value.trim();
        const batchIndex  = Number(root.querySelector('#ce-batch').value);

        const updated = { ...card, front: front || card.front, back: back || card.back, batchIndex };
        if (topic)       updated.topic       = topic;       else delete updated.topic;
        if (subtopic)    updated.subtopic     = subtopic;    else delete updated.subtopic;
        if (subsubtopic) updated.subsubtopic  = subsubtopic; else delete updated.subsubtopic;

        const batchChanged = batchIndex !== originalBatch;
        const newProgress      = batchChanged ? { highestUnlockedBatch: 0, deckComplete: false, batches: [] } : deck.progress;
        const newTopicProgress = batchChanged ? {} : (deck.topicProgress || {});

        // Stamp batchIndex on every card so makeDeck's explicit path sees a consistent set.
        // Without this, cards lacking batchIndex silently default to 0 and collapse into one batch.
        const newCards = deck.cards.map((c, i) => {
          if (i === Number(cardIndex)) return updated;
          if (typeof c.batchIndex === 'number') return c;
          return { ...c, batchIndex: currentBatchOf(c, i, deck) };
        });
        const rebuilt  = makeDeck(deck.id, deck.title, newCards, newProgress, newTopicProgress, deck.batchNames || []);
        state.decks[state.decks.findIndex(d => d.id === deckId)] = rebuilt;
        saveToStorage(state);
        if (fromStudy && !batchChanged && studyBatchIndex != null) {
          state.session = createSession(rebuilt, studyBatchIndex, deckId);
          navigate('study', { deckId });
        } else {
          state.session = null;
          navigate('deck', { deckId });
        }
      });
    },
  };
}
