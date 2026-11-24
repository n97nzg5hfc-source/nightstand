
const $ = (id) => document.getElementById(id);

// CLOCK
function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  $("date").textContent = now.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  $("day").textContent = now.toLocaleDateString([], {
    weekday: "long"
  });
  $("top-date").textContent = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}
updateClock();
setInterval(updateClock, 1000);

// PAGE NAVIGATION
function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const target = $(`${page}-page`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("selected", el.dataset.page === page);
  });

  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-page]").forEach(el => {
  el.addEventListener("click", () => showPage(el.dataset.page));
});

// WEATHER - HENDERSONVILLE, TENNESSEE
async function updateWeather() {
  const temp = document.querySelector(".weather-temp");
  const description = document.querySelector(".weather-main .muted");
  const icon = document.querySelector(".weather-art");
  const location = document.querySelector(".weather-foot strong");
  const clockWeather = $("clock-weather");

  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=36.3048&longitude=-86.62&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FChicago";

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Weather request failed");

    const data = await response.json();
    const current = data.current;
    const high = Math.round(data.daily.temperature_2m_max[0]);
    const low = Math.round(data.daily.temperature_2m_min[0]);
    const temperature = Math.round(current.temperature_2m);

    const weatherTypes = {
      0: ["Clear sky", "☀️"],
      1: ["Mostly clear", "🌤️"],
      2: ["Partly cloudy", "⛅"],
      3: ["Cloudy", "☁️"],
      45: ["Foggy", "🌫️"],
      48: ["Foggy", "🌫️"],
      51: ["Light drizzle", "🌦️"],
      53: ["Drizzle", "🌦️"],
      55: ["Heavy drizzle", "🌧️"],
      61: ["Light rain", "🌧️"],
      63: ["Rain", "🌧️"],
      65: ["Heavy rain", "🌧️"],
      71: ["Light snow", "🌨️"],
      73: ["Snow", "❄️"],
      75: ["Heavy snow", "❄️"],
      80: ["Rain showers", "🌦️"],
      81: ["Rain showers", "🌧️"],
      82: ["Heavy showers", "⛈️"],
      95: ["Thunderstorms", "⛈️"],
      96: ["Thunderstorms", "⛈️"],
      99: ["Thunderstorms", "⛈️"]
    };

    const [condition, emoji] = weatherTypes[current.weather_code] || ["Unknown", "🌡️"];

    temp.textContent = `${temperature}°`;
    description.textContent = condition;
    icon.textContent = emoji;
    location.textContent = `Hendersonville, TN`;
    clockWeather.textContent = `${temperature}° · ${condition}`;

    const foot = document.querySelector(".weather-foot");
    if (foot) {
      foot.innerHTML = `<span>H: ${high}° &nbsp; L: ${low}°</span><strong>Hendersonville, TN</strong>`;
    }
  } catch (error) {
    description.textContent = "Weather unavailable";
    location.textContent = "Check internet connection";
    clockWeather.textContent = "Weather unavailable";
  }
}

updateWeather();
setInterval(updateWeather, 30 * 60 * 1000);

// BATTERY
if ("getBattery" in navigator) {
  navigator.getBattery().then(battery => {
    const render = () => {
      $("battery-value").textContent = `${Math.round(battery.level * 100)}%`;
      $("battery-caption").textContent = battery.charging ? "Charging" : "On battery";
    };
    render();
    battery.addEventListener("levelchange", render);
    battery.addEventListener("chargingchange", render);
  }).catch(() => {});
}

// SERVICE WORKER
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
