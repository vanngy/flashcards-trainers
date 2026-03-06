// Text area + submit button. Ctrl+Enter submits.
// bind(root, onSubmit) — onSubmit(typedString)
export function AnswerInput() {
  return {
    html: `
      <div class="answer-input">
        <textarea
          class="answer-ta"
          rows="5"
          spellcheck="false"
          autocomplete="off"
        ></textarea>
        <div class="answer-input__actions">
          <button class="btn btn--primary submit-btn">Check</button>
        </div>
      </div>
    `,
    bind(root, onSubmit) {
      const ta = root.querySelector('.answer-ta');
      const btn = root.querySelector('.submit-btn');
      ta.focus();

      function submit() { onSubmit(ta.value); }

      btn.addEventListener('click', submit);
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submit(); }
      });
    },
  };
}
