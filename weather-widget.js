(() => {
  const $ = (id) => document.getElementById(id);

  const el = {
    city: $("wxMiniCity"),
    temp: $("wxMiniTemp"),
    desc: $("wxMiniDesc"),
    hi: $("wxMiniHi"),
    lo: $("wxMiniLo"),
    icon: $("wxMiniIcon"),
    hours: $("wxMiniHours"),
  };

  const WMO_TEXT = {
    0:"Clear", 1:"Mostly clear", 2:"Partly cloudy", 3:"Cloudy",
    45:"Fog", 48:"Fog", 51:"Drizzle", 53:"Drizzle", 55:"Drizzle",
    61:"Rain", 63:"Rain", 65:"Rain",
    71:"Snow", 73:"Snow", 75:"Snow",
    80:"Showers", 81:"Showers", 82:"Showers",
    95:"Thunder", 96:"Thunder", 99:"Thunder"
  };

  const iconSVG = (kind) => {
    // minimal white SVG set
    const common = `fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    if (kind === "sun") return `<svg viewBox="0 0 24 24" ${common}><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M5.6 5.6l1.4 1.4"/><path d="M17 17l1.4 1.4"/><path d="M18.4 5.6L17 7"/><path d="M7 17l-1.4 1.4"/><path d="M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8"/></svg>`;
    if (kind === "cloud") return `<svg viewBox="0 0 24 24" ${common}><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 18Z"/></svg>`;
    if (kind === "rain") return `<svg viewBox="0 0 24 24" ${common}><path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 15Z"/><path d="M8 19l-1 2"/><path d="M12 19l-1 2"/><path d="M16 19l-1 2"/></svg>`;
    if (kind === "snow") return `<svg viewBox="0 0 24 24" ${common}><path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 15Z"/><path d="M9 19h0"/><path d="M12 20h0"/><path d="M15 19h0"/></svg>`;
    if (kind === "thunder") return `<svg viewBox="0 0 24 24" ${common}><path d="M7 16h9a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 16Z"/><path d="M13 14l-3 6h3l-1 4 5-7h-3l1-3Z"/></svg>`;
    return `<svg viewBox="0 0 24 24" ${common}><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 18Z"/></svg>`;
  };

  const kindFromWMO = (code) => {
    if (code === 0) return "sun";
    if ([1,2,3].includes(code)) return "cloud";
    if ([45,48].includes(code)) return "cloud";
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "rain";
    if ([71,73,75,77,85,86].includes(code)) return "snow";
    if ([95,96,99].includes(code)) return "thunder";
    return "cloud";
  };

  async function geocodeCity(name){
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=tr&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) throw new Error("city_not_found");
    return { name: r.name, lat: r.latitude, lon: r.longitude };
  }

  async function reverseGeocode(lat, lon){
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=tr&format=json`;
    try{
      const res = await fetch(url);
      const data = await res.json();
      const r = data?.results?.[0];
      return r?.name || null;
    }catch{ return null; }
  }

  async function fetchForecast(lat, lon){
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      timezone: "auto",
      timeformat: "unixtime",
      forecast_days: "2",
      current: "temperature_2m,weather_code",
      hourly: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min"
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("weather_failed");
    return res.json();
  }

  function fmtHour(unix){
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true }).format(new Date(unix * 1000));
  }

  function renderHours(hourly){
       const now = Math.floor(Date.now()/1000);
       const t = hourly.time || [];
       const temp = hourly.temperature_2m || [];
       const code = hourly.weather_code || [];
    
       // next hour index
       let start = t.findIndex(x => x > now);
       if (start < 0) start = 0;
    
       const items = [];
       for (let i = 0; i < 6; i++){
         const idx = start + i;
         if (idx >= t.length) break;
         const k = kindFromWMO(code[idx]);
         items.push(`
           <div class="wxMiniHour">
             <div class="wxMiniHour__t">${fmtHour(t[idx])}</div>
             <div class="wxMiniHour__icon">${iconSVG(k)}</div>
             <div class="wxMiniHour__temp">${Math.round(temp[idx] ?? 0)}°</div>
           </div>
         `);
       }
       el.hours.innerHTML = items.join("");
     }

  function renderAll(placeName, data){
    const c = data.current || {};
    const wmo = c.weather_code;
    const kind = kindFromWMO(wmo);

    el.city.textContent = placeName || "Konum";
    el.temp.textContent = Math.round(c.temperature_2m ?? 0);
    el.desc.textContent = WMO_TEXT[wmo] || "Weather";
    el.icon.innerHTML = iconSVG(kind);

    const d = data.daily || {};
    el.hi.textContent = Math.round(d.temperature_2m_max?.[0] ?? 0);
    el.lo.textContent = Math.round(d.temperature_2m_min?.[0] ?? 0);

    renderHours(data.hourly || {});
  }

  async function loadWithGeo(){
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject();
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => reject(),
        { enableHighAccuracy:false, timeout: 7000, maximumAge: 60000 }
      );
    });
  }

  async function init(){
    try{
      // 1) konum varsa onu kullan
      const pos = await loadWithGeo();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const place = await reverseGeocode(lat, lon);
      const data = await fetchForecast(lat, lon);
      renderAll(place, data);

      setInterval(async () => {
        try{
          const d = await fetchForecast(lat, lon);
          renderAll(place, d);
        }catch{}
      }, 300000); // 5 dk
    }catch{
      // 2) izin yoksa Ankara fallback
      const geo = await geocodeCity("Ankara");
      const data = await fetchForecast(geo.lat, geo.lon);
      renderAll(geo.name, data);

      setInterval(async () => {
        try{
          const d = await fetchForecast(geo.lat, geo.lon);
          renderAll(geo.name, d);
        }catch{}
      }, 300000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();