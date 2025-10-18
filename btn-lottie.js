document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.neo-btn-lottie');

  buttons.forEach(button => {
    const arrowContainer = button.querySelector('.lottie-arrow');

    const animation = lottie.loadAnimation({
      container: arrowContainer,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'assets/animations/system-regular-161-arrow-long-right-in-reveal.json'
    });

    animation.setSpeed(1.5);

    button.addEventListener('mouseenter', () => animation.play());
    button.addEventListener('mouseleave', () => {
      animation.stop();
      animation.goToAndStop(0, true);
    });

    // 🔹 Tıklanınca ilgili HTML sayfasına git
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      if (target) window.location.href = target;
    });
  });
});