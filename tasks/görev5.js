// tasks/görev5.js  — delegation + style inject (guaranteed)
(() => {
  // aynı görev tekrar açılınca 2 kez init olmasın
  if (window.__gorev5_inited) return;
  window.__gorev5_inited = true;

  const getRoot = () => document.getElementById("taskContent") || document;

  // Eğer CSS yoksa, en kritik stilleri JS ile ekle (hidden + rainbow)
  const ensureStyles = () => {
    if (document.getElementById("gorev5-styles")) return;
    const style = document.createElement("style");
    style.id = "gorev5-styles";
    style.textContent = `
      .rectangle-img{ transition: opacity .28s ease, transform .28s ease; }
      .rectangle-img.hidden{ opacity:0; transform: scale(.85); pointer-events:none; }

      .btn.rainbow-active{
        background: linear-gradient(90deg,#0F2027,#12C0C0,#9DF2EE,#12C0C0,#0F2027);
        background-size: 200% 100%;
        animation: gorev5Rainbow 3000ms linear;
        color:#fff;
        border-color: rgba(255,255,255,.55);
      }
      @keyframes gorev5Rainbow{
        0%{ background-position: 100% 0; }
        100%{ background-position: -100% 0; }
      }
    `;
    document.head.appendChild(style);
  };

  ensureStyles();

  const operatorImages = [
    "görev4 assets/r6-operators-list-bandit.png.avif",
    "görev4 assets/r6-operators-list-blitz.png.avif",
    "görev4 assets/r6-operators-list-doc.png.avif",
    "görev4 assets/r6-operators-list-fuze.png.avif",
    "görev4 assets/r6-operators-list-glaz.png.avif",
    "görev4 assets/r6-operators-list-iq.png.avif",
    "görev4 assets/r6-operators-list-jager.png.avif",
    "görev4 assets/r6-operators-list-kapkan.png.avif",
    "görev4 assets/r6-operators-list-montagne.png.avif",
    "görev4 assets/r6-operators-list-rook.png.avif",
    "görev4 assets/r6-operators-list-twitch.png.avif",
    "görev4 assets/r6s-operators-list-tachanka.png.avif",
  ];

  let spinning = false;

  // ✅ Delegation: içerik sonradan gelse bile click yakalanır
  document.addEventListener("click", (e) => {
    const root = getRoot();
    const btn = e.target.closest(".show-btn, .hide-btn, .random-btn");
    if (!btn) return;
    if (!root.contains(btn)) return; // başka sayfadaki btn'leri etkilenmesin

    // Göster / Gizle
    if (btn.classList.contains("show-btn") || btn.classList.contains("hide-btn")) {
      const id = btn.getAttribute("data-target");
      const box = root.querySelector(`.rectangle-img[data-id="${id}"]`);
      if (!box) return;

      if (btn.classList.contains("hide-btn")) box.classList.add("hidden");
      else box.classList.remove("hidden");

      return;
    }

    // Rastgele Çevir
    if (btn.classList.contains("random-btn")) {
      if (spinning) return;

      const imgs = root.querySelectorAll(".rectangle-img img");
      if (!imgs.length) return;

      const duration = 3000;
      const interval = 150;
      let elapsed = 0;

      spinning = true;
      btn.disabled = true;
      btn.textContent = "Çevriliyor...";
      btn.classList.add("rainbow-active");

      const timer = setInterval(() => {
        imgs.forEach((img) => {
          img.src = operatorImages[Math.floor(Math.random() * operatorImages.length)];
        });

        elapsed += interval;
        if (elapsed >= duration) {
          clearInterval(timer);
          spinning = false;
          btn.disabled = false;
          btn.textContent = "Rastgele Çevir";
          btn.classList.remove("rainbow-active");
        }
      }, interval);

      return;
    }
  });

  console.log("✅ görev5.js READY (delegation)");
})();