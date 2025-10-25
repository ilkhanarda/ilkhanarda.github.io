document.addEventListener('DOMContentLoaded', () => {
  const buttons = Array.from(document.querySelectorAll('.neo-btn:not(.ghost)'));
  const statusEl = document.querySelector('.status');

  if (!buttons.length) return;

  const pressDuration = 160;

  const lottieAvailable = typeof window.lottie !== 'undefined';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (lottieAvailable) {
    const special = document.querySelector('.neo-btn.btn-s');
    if (special) {
      const host = document.createElement('div');
      host.className = 'lottie-host';
      special.appendChild(host);

      try {
        const anim = window.lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: true,
          autoplay: !prefersReduced || true, // generally autoplay; reduced-motion users will still be respected by lottie players
          path: 'assets/animations/system-regular-134-celebration-hover-celebration.json'
        });

        special.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          special.classList.add('pressed');
          try { anim.goToAndPlay(0, true); } catch (err) {}
        });
        special.addEventListener('pointerup', () => special.classList.remove('pressed'));
        special.addEventListener('pointerleave', () => special.classList.remove('pressed'));
      } catch (e) {
      }
    }
  }

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
    const target = el.dataset.target;
    
    if (week) {
      flashPress(el);
      selectWeek(week, el);
    }
    
    if (target) {
      setTimeout(() => {
        window.location.href = target;
      }, pressDuration);
    }
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
