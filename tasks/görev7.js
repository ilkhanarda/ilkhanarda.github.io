const $ = (id) => document.getElementById(id);

  const el = {
    city: $("cityInput"),
    status: $("status"),
    statusText: $("statusText"),
    place: $("place"),
    meta: $("meta"),
    updated: $("updated"),
    emoji: $("emoji"),
    temp: $("temp"),
    desc: $("desc"),
    feels: $("feels"),
    hum: $("hum"),
    wind: $("wind"),
    prec: $("prec"),
    vis: $("vis"),
    pressure: $("pressure"),
    searchBtn: $("searchBtn"),
    geoBtn: $("geoBtn"),
  };

  const WMO = {
    0:  ["☀️", "Açık"],
    1:  ["🌤️", "Çoğunlukla açık"],
    2:  ["⛅️", "Parçalı bulutlu"],
    3:  ["☁️", "Kapalı"],
    45: ["🌫️", "Sis"],
    48: ["🌫️", "Kırağı sisi"],
    51: ["🌦️", "Hafif çisenti"],
    53: ["🌦️", "Çisenti"],
    55: ["🌧️", "Yoğun çisenti"],
    56: ["🌧️", "Hafif dondurucu çisenti"],
    57: ["🌧️", "Dondurucu çisenti"],
    61: ["🌧️", "Hafif yağmur"],
    63: ["🌧️", "Yağmur"],
    65: ["🌧️", "Yoğun yağmur"],
    66: ["🌧️", "Hafif dondurucu yağmur"],
    67: ["🌧️", "Dondurucu yağmur"],
    71: ["🌨️", "Hafif kar"],
    73: ["🌨️", "Kar"],
    75: ["❄️", "Yoğun kar"],
    77: ["❄️", "Kar taneleri"],
    80: ["🌦️", "Hafif sağanak"],
    81: ["🌦️", "Sağanak"],
    82: ["⛈️", "Şiddetli sağanak"],
    85: ["🌨️", "Hafif kar sağanağı"],
    86: ["🌨️", "Kar sağanağı"],
    95: ["⛈️", "Gök gürültülü fırtına"],
    96: ["⛈️", "Dolu ihtimalli fırtına"],
    99: ["⛈️", "Şiddetli dolu ihtimalli fırtına"],
  };

  function showStatus(text){
    el.status.style.display = "flex";
    el.statusText.textContent = text || "Yükleniyor…";
  }
  function hideStatus(){
    el.status.style.display = "none";
  }

  function fmtTime(iso){
    try{
      const d = iso ? new Date(iso) : new Date();
      return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(d);
    }catch{ return ""; }
  }

  function compass(deg){
    if (deg == null || isNaN(deg)) return "";
    const dirs = ["K","KKD","KD","DKD","D","DGD","GD","GGD","G","GGB","GB","BGB","B","BKB","KB","KKB"];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  async function geocodeCity(name){
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=tr&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("geocode_failed");
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) throw new Error("city_not_found");
    return {
      name: [first.name, first.admin1, first.country].filter(Boolean).join(", "),
      latitude: first.latitude,
      longitude: first.longitude,
      timezone: first.timezone || "auto"
    };
  }

  async function reverseGeocode(lat, lon){
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&count=1&language=tr&format=json`;
    try{
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const first = data?.results?.[0];
      if (!first) return null;
      return [first.name, first.admin1, first.country].filter(Boolean).join(", ");
    }catch{
      return null;
    }
  }

  async function fetchCurrent(lat, lon, tz="auto"){
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      timezone: tz,
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "visibility",
        "pressure_msl",
      ].join(",")
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("weather_failed");
    return res.json();
  }

  let refreshTimer = null;

  function render(placeLabel, lat, lon, current){
    const code = current.weather_code;
    const [emoji, desc] = WMO[code] || ["⛅️", "Hava durumu"];
    el.place.textContent = placeLabel || "Bilinmeyen konum";
    el.meta.textContent = `Enlem: ${Number(lat).toFixed(3)} • Boylam: ${Number(lon).toFixed(3)}`;
    el.emoji.textContent = emoji;
    el.desc.textContent = `${desc} (WMO: ${code ?? "?"})`;
    el.temp.textContent = Math.round(current.temperature_2m ?? 0);
    el.feels.textContent = `${Math.round(current.apparent_temperature ?? 0)}°`;
    el.hum.textContent = `${Math.round(current.relative_humidity_2m ?? 0)}%`;
    el.vis.textContent = `${Math.round(current.visibility ?? 0)}km`;

    const w = current.wind_speed_10m ?? 0;
    const dir = compass(current.wind_direction_10m);
    el.wind.textContent = `${Math.round(w)} km/s${dir ? " • " + dir : ""}`;

    const p = current.pressure_msl;
    el.pressure.textContent = (p == null || isNaN(p)) ? "-- hPa" : `${Math.round(p)} hPa`;

    const v = current.visibility;
    el.vis.textContent = (v == null || isNaN(v)) ? "-- km" : `${(v / 1000).toFixed(1)} km`;

    el.prec.textContent = `${(current.precipitation ?? 0).toFixed(1)} mm`;
    el.updated.textContent = `Güncellendi: ${fmtTime(current.time)} (60 sn’de bir yenilenir)`;
  }

  async function loadForLatLon(lat, lon, placeHint){
    showStatus("Hava durumu alınıyor…");
    try{
      const placeLabel = placeHint || await reverseGeocode(lat, lon) || "Konum";
      const data = await fetchCurrent(lat, lon, "auto");
      render(placeLabel, lat, lon, data.current || {});
      hideStatus();

      clearInterval(refreshTimer);
      refreshTimer = setInterval(async () => {
        try{
          const d = await fetchCurrent(lat, lon, "auto");
          render(placeLabel, lat, lon, d.current || {});
        }catch{}
      }, 60000);

    }catch(err){
      hideStatus();
      el.desc.textContent = "Veri alınamadı. İnternet bağlantını kontrol et.";
      console.error(err);
    }
  }

  async function loadForCity(name){
    showStatus("Şehir aranıyor…");
    try{
      const geo = await geocodeCity(name);
      showStatus("Hava durumu alınıyor…");
      const data = await fetchCurrent(geo.latitude, geo.longitude, geo.timezone || "auto");
      render(geo.name, geo.latitude, geo.longitude, data.current || {});
      hideStatus();

      clearInterval(refreshTimer);
      refreshTimer = setInterval(async () => {
        try{
          const d = await fetchCurrent(geo.latitude, geo.longitude, geo.timezone || "auto");
          render(geo.name, geo.latitude, geo.longitude, d.current || {});
        }catch{}
      }, 60000);

    }catch(err){
      hideStatus();
      el.desc.textContent = (err && err.message === "city_not_found")
        ? "Şehir bulunamadı. Yazımı kontrol et."
        : "Şehir bilgisi alınamadı. İnternet bağlantını kontrol et.";
      console.error(err);
    }
  }

  function requestGeolocation(){
    if (!navigator.geolocation){
      el.desc.textContent = "Tarayıcı konumu desteklemiyor. Şehir aramayı kullan.";
      return;
    }
    showStatus("Konum izni bekleniyor…");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadForLatLon(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        hideStatus();
        el.desc.textContent = "Konum izni verilmedi. Şehir araması ile devam edebilirsin.";
        console.warn(err);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  // UI events
  el.searchBtn.addEventListener("click", () => {
    const name = (el.city.value || "").trim();
    if (!name) return;
    loadForCity(name);
  });

  el.city.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      el.searchBtn.click();
    }
  });

  el.geoBtn.addEventListener("click", requestGeolocation);

  document.querySelectorAll("[data-city]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-city");
      el.city.value = name;
      loadForCity(name);
    });
  });

  // Initial load
  requestGeolocation();
