document.addEventListener('DOMContentLoaded', () => {
  const buttons = Array.from(document.querySelectorAll('.neo-btn:not(.ghost)'));
  const statusEl = document.querySelector('.status');

  if (!buttons.length) return;

  const pressDuration = 160;

  function flashPress(el) {
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), pressDuration);
  }

  function clearActive() {
    buttons.forEach(b => {
      b.classList.remove('active');
      b.removeAttribute('aria-pressed');
    });
  }

  function selectWeek(week, el) {
    if (statusEl) statusEl.textContent = `Seçili hafta: Hafta ${week}`;
    clearActive();
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');
  }

  function handleAction(el) {
    const week = el.dataset.week;
    if (!week) return;
    flashPress(el);
    selectWeek(week, el);
  }

  buttons.forEach(btn => {
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-pressed', 'false');

    btn.addEventListener('click', () => handleAction(btn));

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAction(btn);
      }
    });
  });
});
