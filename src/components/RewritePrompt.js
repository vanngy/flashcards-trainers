import { escapeHtml } from '../utils.js';

// Ghost-overlay rewrite prompt.
// Both the ghost and the input are <textarea> elements in the same CSS grid
// cell so their text rendering is pixel-identical.
// bind(root, onSubmit, onMarkCorrect)
export function RewritePrompt({ correctAnswer }) {
  return {
    html: `
      <div class="answer-input">
        <div class="rewrite-field">
          <textarea
            class="rewrite-ghost-ta"
            tabindex="-1"
            aria-hidden="true"
            readonly
          >${escapeHtml(correctAnswer)}</textarea>
          <textarea
            class="rewrite-ta answer-ta"
            rows="5"
            spellcheck="false"
            autocomplete="off"
            readonly
          ></textarea>
        </div>
        <div class="answer-input__actions">
          <button class="btn btn--ghost mark-correct-btn">I was correct</button>
          <button class="btn btn--primary rewrite-btn" disabled>Check (5)</button>
        </div>
      </div>
    `,
    bind(root, onSubmit, onMarkCorrect) {
      const ta = root.querySelector('.rewrite-ta');
      const ghostTa = root.querySelector('.rewrite-ghost-ta');
      const btn = root.querySelector('.rewrite-btn');
      const mcBtn = root.querySelector('.mark-correct-btn');

      // Sync scroll so ghost tracks the input textarea
      ta.addEventListener('scroll', () => { ghostTa.scrollTop = ta.scrollTop; });

      // During countdown: keep input transparent so only ghost is visible
      ta.style.color = 'transparent';
      ta.style.caretColor = 'transparent';

      let secs = 5;
      const timer = setInterval(() => {
        if (!btn.isConnected) { clearInterval(timer); return; }
        secs--;
        if (secs > 0) {
          btn.textContent = `Check (${secs})`;
        } else {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = 'Check';
          ta.removeAttribute('readonly');
          ta.style.color = '';
          ta.style.caretColor = '';
          ta.focus();
        }
      }, 1000);

      function submit() {
        if (btn.disabled) return;
        onSubmit(ta.value);
      }

      btn.addEventListener('click', submit);
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submit(); }
      });

      if (mcBtn && onMarkCorrect) {
        mcBtn.addEventListener('click', onMarkCorrect);
      }
    },
  };
}
