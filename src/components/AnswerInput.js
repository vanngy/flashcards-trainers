// Text area + submit button. Ctrl+Enter submits.
// feedback = null | { type: 'incorrect', msg: string }
// bind(root, onSubmit, onMarkCorrect) — onSubmit(typedString), onMarkCorrect()
export function AnswerInput({ feedback }) {
  const fbHtml = feedback
    ? `<div class="feedback feedback--incorrect">${feedback.msg}</div>
       <button type="button" class="btn btn--ghost mark-correct-btn">I was correct (typo)</button>`
    : '';

  return {
    html: `
      <div class="answer-input">
        <textarea
          class="answer-ta"
          placeholder="Type the answer exactly…"
          rows="5"
          spellcheck="false"
          autocomplete="off"
        ></textarea>
        ${fbHtml}
        <div class="answer-input__actions">
          <button class="btn btn--primary submit-btn">Check</button>
        </div>
      </div>
    `,
    bind(root, onSubmit, onMarkCorrect) {
      const ta = root.querySelector('.answer-ta');
      const btn = root.querySelector('.submit-btn');
      const mcBtn = root.querySelector('.mark-correct-btn');
      ta.focus();

      function submit() { onSubmit(ta.value); }

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
