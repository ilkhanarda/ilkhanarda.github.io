// =====================
//  BTE311 iMessage UI
//  app.js (single file)
// =====================

// ---- Settings ----
const AVATAR_URL = "images/profile picture/ilkhan.jpg"; // isteğe bağlı
const DISPLAY_NAME = "İlkhan Arda AKMACA";
const FALLBACK_TEXT = "İAA";

const scriptLines = [
  "Merhabalar Websiteme Hoş geldiniz!",
  "Bu site BTE311 Dersi kapsamı için tasarlanmıştır.",
  "Hazırsan, aşağıdaki görevlerden birisini seçebilir ya da ismini yazarak ilgili sayfaya gidebilirsin."
];

// Mesajlar başlamadan önce beklenecek süre (ms)
const MESSAGE_START_DELAY = 1800;

// Allowed routes (validate + suggest)
const ROUTES = ["görev1","görev2","görev3","görev4","görev5","görev6","görev7","lab-1"];

// ---- DOM ----
const thread = document.getElementById("thread");
const messagesEl = document.getElementById("messages");
const routeInput = document.getElementById("routeInput");
const composerForm = document.getElementById("composerForm");

const toastEl = document.getElementById("toast");
const clockEl = document.getElementById("clock");

const xmasToggle = document.getElementById("xmasToggle");
const snowLevelBtn = document.getElementById("snowLevelBtn");
const volumeBtn = document.getElementById("volumeBtn");

const snowCanvas = document.getElementById("snow");
const jingle = document.getElementById("jingle");

if (!thread || !messagesEl) console.warn("thread/messages elementleri bulunamadı.");
if (!snowCanvas) console.warn("#snow canvas bulunamadı.");
if (!jingle) console.warn("#jingle audio bulunamadı. index.html'e audio eklemelisin.");

// ---- Helpers ----
function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

function scrollToBottom(){
  if (!thread) return;
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
}

function formatTime(d = new Date()){
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

// ---------- Toast ----------
let toastTimer = null;
function showToast(message, ms = 2400){
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

// ---------- Normalize + Suggest ----------
function stripDiacritics(str){
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normKey(str){
  return stripDiacritics((str || "").trim().toLowerCase())
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");
}
function levenshtein(a, b){
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++){
    for (let j = 1; j <= n; j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + cost
      );
    }
  }
  return dp[m][n];
}

const routeMap = new Map(); // normalized -> canonical
ROUTES.forEach(r => routeMap.set(normKey(r), r));

function resolveRoute(raw){
  const value = (raw ?? "").trim();
  if (!value) return { ok: false, reason: "empty" };

  const noHtml = value.replace(/\.html$/i, "");
  const nk = normKey(noHtml);

  if (routeMap.has(nk)){
    return { ok: true, canonical: routeMap.get(nk) };
  }

  let best = null;
  let bestScore = Infinity;
  for (const r of ROUTES){
    const score = levenshtein(nk, normKey(r));
    if (score < bestScore){
      bestScore = score;
      best = r;
    }
  }

  if (best && bestScore <= 2){
    return { ok: false, reason: "suggest", suggestion: best };
  }
  return { ok: false, reason: "notfound" };
}

// ---------- Messages UI ----------
function makeAvatar(){
  const avatar = document.createElement("div");
  avatar.className = "avatar";

  if (AVATAR_URL){
    const img = document.createElement("img");
    img.src = AVATAR_URL;
    img.alt = DISPLAY_NAME;
    avatar.appendChild(img);
  } else {
    const fb = document.createElement("div");
    fb.className = "fallback";
    fb.textContent = FALLBACK_TEXT;
    avatar.appendChild(fb);
  }

  return avatar;
}

let dividerAdded = false;
function addTodayDivider(){
  if (dividerAdded || !messagesEl) return;
  dividerAdded = true;

  const row = document.createElement("div");
  row.className = "day-divider";

  const pill = document.createElement("span");
  pill.textContent = `Today • ${formatTime()}`;

  row.appendChild(pill);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function addSystemMessage(text){
  if (!messagesEl) return;
  const row = document.createElement("div");
  row.className = "system-row";

  const pill = document.createElement("div");
  pill.className = "system-pill";
  pill.textContent = text;

  row.appendChild(pill);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function createRow({ text, showName, typing }){
  const row = document.createElement("div");
  row.className = "msg-row";

  const msg = document.createElement("div");
  msg.className = "msg";

  const avatar = makeAvatar();

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  if (showName){
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = DISPLAY_NAME;
    wrap.appendChild(name);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (typing ? " typing" : "");

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = "";

  if (typing){
    const dots = document.createElement("span");
    dots.className = "dots";
    dots.innerHTML = "<span class='dot'></span><span class='dot'></span><span class='dot'></span>";
    bubble.appendChild(dots);
    bubble.setAttribute("aria-label", "Yazıyor…");
  } else {
    bubble.textContent = text;
    meta.textContent = formatTime();
  }

  wrap.appendChild(bubble);
  wrap.appendChild(meta);

  msg.appendChild(avatar);
  msg.appendChild(wrap);

  row.appendChild(msg);
  messagesEl.appendChild(row);

  scrollToBottom();
  return { bubble, meta };
}

async function runMessages(){
  // Mesaj akışı başlamadan önce kısa bekleme
  await wait(MESSAGE_START_DELAY);
  addTodayDivider();

  for (let i = 0; i < scriptLines.length; i++){
    const typing = createRow({ text: "", showName: i === 0, typing: true });
    await wait(900);

    typing.bubble.classList.remove("typing");
    typing.bubble.removeAttribute("aria-label");
    typing.bubble.textContent = scriptLines[i];
    typing.bubble.classList.add("reveal");
    setTimeout(() => typing.bubble.classList.remove("reveal"), 600);

    typing.meta.textContent = formatTime();
    scrollToBottom();
    await wait(650);
  }
}

// ---------- Routing + validation ----------
function goToRoute(canonical){
  const url = `task.html?task=${encodeURIComponent(canonical)}`;

  const card = document.querySelector(".card");
  if (card){
    card.classList.add("leaving");
    setTimeout(() => { window.location.href = url; }, 320);
  } else {
    window.location.href = url;
  }
}

function handleRouteSubmit(raw){
  const res = resolveRoute(raw);

  if (res.ok){
    if (routeInput) routeInput.value = res.canonical;
    showToast(`Yönlendiriliyor: ${res.canonical}.html`);
    goToRoute(res.canonical);
    return;
  }

  if (res.reason === "empty"){
    showToast("Bir görev adı yazmalısın. Örn: görev4");
    return;
  }

  if (res.reason === "suggest"){
    if (routeInput) routeInput.value = res.suggestion;
    showToast(`Bulunamadı. Şunu mu demek istedin: ${res.suggestion}?`);
    routeInput?.focus();
    return;
  }

  showToast("Görev bulunamadı. Örn: görev1, görev2, Lab-1");
}

document.querySelectorAll(".pill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (routeInput) routeInput.value = btn.dataset.fill || "";
    routeInput?.focus();
  });
});

composerForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  handleRouteSubmit(routeInput?.value || "");
});

// ---------- Clock ----------
function updateClock(){
  const now = new Date();
  const date = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(now);
  const time = formatTime(now);
  if (clockEl) clockEl.textContent = `${date} • ${time}`;
}
updateClock();
setInterval(updateClock, 15000);

// ================================
//  Christmas Mode: snow + jingle
// ================================

// ---- Snow Levels ----
const ctx = snowCanvas?.getContext("2d");
let W = 0, H = 0;
let flakes = [];
let snowEnabled = false;
let rafId = null;

const SNOW_LEVELS = [
  { name: "Low",    count: 110, vy:[0.6,1.3], vx:[0.35,0.9] },
  { name: "Medium", count: 170, vy:[0.7,1.7], vx:[0.45,1.15] },
  { name: "High",   count: 260, vy:[0.9,2.2], vx:[0.55,1.35] },
];
let snowLevelIdx = 1; // Medium default

// restore snow level
try{
  const savedLevel = parseInt(localStorage.getItem("snow_level") || "1", 10);
  if (!Number.isNaN(savedLevel) && savedLevel >= 0 && savedLevel < SNOW_LEVELS.length) snowLevelIdx = savedLevel;
}catch(e){}

function rand(min, max){ return Math.random() * (max - min) + min; }

function resizeSnow(){
  if (!snowCanvas || !ctx) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  snowCanvas.width = Math.floor(W * dpr);
  snowCanvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedFlakes(){
  if (!ctx) return;
  const L = SNOW_LEVELS[snowLevelIdx];
  flakes = [];
  for (let i = 0; i < L.count; i++){
    flakes.push({
      x: rand(0, W),
      y: rand(0, H),
      s: Math.round(rand(2, 4)),
      vy: rand(L.vy[0], L.vy[1]),
      vx: rand(L.vx[0], L.vx[1]),
      a: rand(0.35, 0.92),
    });
  }
}

function updateSnowLevelUI(){
  if (!snowLevelBtn) return;
  snowLevelBtn.textContent = `❄️ ${SNOW_LEVELS[snowLevelIdx].name}`;
}
updateSnowLevelUI();

snowLevelBtn?.addEventListener("click", () => {
  snowLevelIdx = (snowLevelIdx + 1) % SNOW_LEVELS.length;
  try{ localStorage.setItem("snow_level", String(snowLevelIdx)); } catch(e){}
  updateSnowLevelUI();
  if (snowEnabled){
    seedFlakes();
    showToast(`Kar yoğunluğu: ${SNOW_LEVELS[snowLevelIdx].name}`);
  }
});

function stepSnow(){
  if (!ctx) return;

  if (!snowEnabled){
    ctx.clearRect(0, 0, W, H);
    rafId = null;
    return;
  }

  ctx.clearRect(0, 0, W, H);
  for (const f of flakes){
    f.x += f.vx;
    f.y += f.vy;

    if (f.x > W + 10) f.x = -10;
    if (f.y > H + 10) f.y = -10;

    ctx.globalAlpha = f.a;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s);
  }
  ctx.globalAlpha = 1;
  rafId = requestAnimationFrame(stepSnow);
}

function startSnow(){
  if (!ctx) return;
  resizeSnow();
  seedFlakes();
  snowEnabled = true;
  if (!rafId) rafId = requestAnimationFrame(stepSnow);
}

function stopSnow(){
  if (!ctx) return;
  snowEnabled = false;
  if (rafId){
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  ctx.clearRect(0, 0, W, H);
}

// ---- Jingle Volume Levels: Kapalı -> Düşük -> Orta -> Yüksek ----
const VOLUME_LEVELS = [
  { name: "Kapalı", value: 0.00 },
  { name: "Düşük",  value: 0.25 },
  { name: "Orta",   value: 0.50 },
  { name: "Yüksek", value: 0.75 },
];

let volumeIdx = 0; // default: Kapalı

try{
  const savedVol = parseInt(localStorage.getItem("xmas_volume") || "0", 10);
  if (!Number.isNaN(savedVol) && savedVol >= 0 && savedVol < VOLUME_LEVELS.length) volumeIdx = savedVol;
}catch(e){}

function setVolumeBtnLabel(){
  if (!volumeBtn) return;
  const level = VOLUME_LEVELS[volumeIdx];
  volumeBtn.textContent = level.value === 0 ? "🔇 Kapalı" : `🔊 ${level.name}`;
}

function applyVolume(){
  if (!jingle) { setVolumeBtnLabel(); return; }
  const level = VOLUME_LEVELS[volumeIdx];

  if (level.value === 0){
    jingle.pause();
    // istersen kapatınca başa sar:
    // jingle.currentTime = 0;
    setVolumeBtnLabel();
    return;
  }

  jingle.volume = level.value;
  setVolumeBtnLabel();
}

setVolumeBtnLabel();
applyVolume();

async function playJingleIfAllowed(){
  if (!jingle) return;
  const level = VOLUME_LEVELS[volumeIdx];
  if (level.value === 0) return; // Kapalıysa çalma

  try{
    jingle.volume = level.value;
    await jingle.play();
  } catch(e){
    // Autoplay restriction: kullanıcı etkileşimi gerekir
    showToast("Müzik için ses butonuna tıkla 🎵");
  }
}

function stopJingle(resetToStart = false){
  if (!jingle) return;
  jingle.pause();
  if (resetToStart) jingle.currentTime = 0;
}

volumeBtn?.addEventListener("click", async () => {
  volumeIdx = (volumeIdx + 1) % VOLUME_LEVELS.length;
  try{ localStorage.setItem("xmas_volume", String(volumeIdx)); } catch(e){}

  applyVolume();
  showToast(`Ses: ${VOLUME_LEVELS[volumeIdx].name}`);

  const isChristmasOn = document.body.classList.contains("christmas");
  if (isChristmasOn && VOLUME_LEVELS[volumeIdx].value > 0){
    await playJingleIfAllowed();
  }
});

// ---- Christmas Mode Toggle ----
async function setChristmasMode(on){
  document.body.classList.toggle("christmas", !!on);

  if (on){
    startSnow();
    showToast("Christmas Mode: ON");

    applyVolume();
    await playJingleIfAllowed();
  } else {
    stopSnow();
    stopJingle(true);
    showToast("Christmas Mode: OFF");
  }

  try{ localStorage.setItem("christmas_mode", on ? "1" : "0"); } catch(e){}
}

window.addEventListener("resize", () => {
  resizeSnow();
  if (snowEnabled) seedFlakes();
});

// restore mode
let savedMode = "0";
try{ savedMode = localStorage.getItem("christmas_mode") || "0"; } catch(e){}
const initialOn = savedMode === "1";

if (xmasToggle){
  xmasToggle.checked = initialOn;
  xmasToggle.addEventListener("change", async () => {
    await setChristmasMode(xmasToggle.checked);
  });
}

// ---- Opening cinematic trigger ----
window.addEventListener("load", async () => {
  setTimeout(() => document.body.classList.add("loaded"), 60);
  await setChristmasMode(initialOn);
  runMessages();
});