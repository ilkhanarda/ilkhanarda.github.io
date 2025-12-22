console.log("✅ görev5.js LOADED");

(() => {
  // Ensure cinematic / reveal works even if CSS expects it
  document.body.classList.add("task-page");
  document.body.classList.add("loaded");

  // Elements
  const toastEl = document.getElementById("toast");
  const titleEl = document.getElementById("taskTitle");
  const contentEl = document.getElementById("taskContent");
  const backHomeBtn = document.getElementById("backHome");

  function showToast(msg, ms = 2200) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function getTaskName() {
    const p = new URLSearchParams(location.search);
    return (p.get("task") || "").trim();
  }

  function goHome() {
    const card = document.querySelector(".card");
    if (card) {
      card.classList.add("leaving");
      setTimeout(() => (location.href = "index.html"), 280);
    } else {
      location.href = "index.html";
    }
  }

  async function loadTask() {
    const task = getTaskName();

    if (!task) {
      if (titleEl) titleEl.textContent = "BTE311 — Görev bulunamadı";
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="system-row">
            <div class="system-pill">Görev parametresi yok. Örnek: <b>task.html?task=görev1</b></div>
          </div>
          <div style="padding:12px 10px; line-height:1.6; color: rgba(17,17,17,.70);">
            <button class="pill-btn" type="button" id="goHomeInline">Ana sayfaya dön</button>
          </div>
        `;
        document.getElementById("goHomeInline")?.addEventListener("click", goHome);
      }
      showToast("Görev seçilmedi");
      return;
    }

    if (titleEl) titleEl.textContent = `BTE311 — ${task}`;
    document.title = `BTE311 — ${task}`;

    const url = `tasks/${encodeURIComponent(task)}.html`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("not_ok");
      const html = await res.text();
      if (contentEl) contentEl.innerHTML = html;
      function runInlineScripts(container){
  const scripts = Array.from(container.querySelectorAll("script"));
  for (const oldScript of scripts){
    const s = document.createElement("script");
    for (const attr of oldScript.attributes) s.setAttribute(attr.name, attr.value);
    if (!oldScript.src) s.textContent = oldScript.textContent;
    oldScript.replaceWith(s);
  }
}

// ...
contentEl.innerHTML = html;
runInlineScripts(contentEl);
    } catch (e) {
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="system-row">
            <div class="system-pill">Bu görev içeriği bulunamadı: <b>${task}</b></div>
          </div>
          <div style="padding:12px 10px; line-height:1.6; color: rgba(17,17,17,.70);">
            <p style="margin:0 0 10px 0;"><b>Beklenen dosya:</b> <code>${url}</code></p>
            <button class="pill-btn" type="button" id="goHomeInline">Ana sayfaya dön</button>
          </div>
        `;
        document.getElementById("goHomeInline")?.addEventListener("click", goHome);
      }
      showToast("İçerik dosyası bulunamadı");
    }
  }

  // Events
  backHomeBtn?.addEventListener("click", goHome);

  // Load
  loadTask();
})();