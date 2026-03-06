import { escapeHtml } from '../utils.js';

// Build HTML for the correct answer with words that differ from the typed
// answer highlighted (red, bold, underlined).
function buildDiffHtml(typed, correct) {
  const typedWords = typed.trim().split(/\s+/).filter(Boolean);

  // Normalize a word for comparison: strip punctuation, keep case
  function norm(s) { return s.replace(/[^\p{L}\p{N}]/gu, ''); }

  // Split correct answer preserving whitespace tokens (including newlines)
  const tokens = correct.split(/(\s+)/);
  let wordIdx = 0;

  return tokens.map(token => {
    if (!token) return '';
    if (/^\s+$/.test(token)) return escapeHtml(token);

    const correctNorm = norm(token);
    const typedNorm = wordIdx < typedWords.length ? norm(typedWords[wordIdx]) : '';
    wordIdx++;

    if (correctNorm && correctNorm === typedNorm) return escapeHtml(token);
    return `<span class="diff-wrong">${escapeHtml(token)}</span>`;
  }).join('');
}

// Shows the correct answer (red box) with diff highlighting after a wrong attempt.
// bind(root, onContinue, onMarkCorrect)
export function WrongAnswer({ correctAnswer, typedAnswer }) {
  const diffHtml = buildDiffHtml(typedAnswer || '', correctAnswer);

  return {
    html: `
      <div class="answer-input">
        <div class="wrong-answer-box">${diffHtml}</div>
        <div class="answer-input__actions">
          <button class="btn btn--ghost mark-correct-btn">I was correct</button>
          <button class="btn btn--primary continue-btn" disabled>Continue (5)</button>
        </div>
      </div>
    `,
    bind(root, onContinue, onMarkCorrect) {
      const btn = root.querySelector('.continue-btn');
      const mcBtn = root.querySelector('.mark-correct-btn');

      // "I was correct" is always immediately clickable
      if (mcBtn && onMarkCorrect) {
        mcBtn.addEventListener('click', onMarkCorrect);
      }

      let secs = 5;
      const timer = setInterval(() => {
        if (!btn.isConnected) { clearInterval(timer); return; }
        secs--;
        if (secs > 0) {
          btn.textContent = `Continue (${secs})`;
        } else {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = 'Continue';
        }
      }, 1000);
      btn.addEventListener('click', () => { if (!btn.disabled) onContinue(); });
    },
  };
}
