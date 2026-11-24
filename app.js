
const $ = (id) => document.getElementById(id);

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

function showPage(page) {
  document.querySelectorAll(".page").forEach(el =>
    el.classList.remove("active")
  );
  const target = $(`${page}-page`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(el =>
    el.classList.toggle("selected", el.dataset.page === page)
  );
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-page]").forEach(el => {
  el.addEventListener("click", () => showPage(el.dataset.page));
});

// HENDERSONVILLE WEATHER
async function updateWeather() {
  const temp = document.querySelector(".weather-temp");
  const description = document.querySelector(".weather-main .muted");
  const art = document.querySelector(".weather-art");
  const location = document.querySelector(".weather-foot strong");

  if (!temp || !description || !art || !location) return;

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=36.3048&longitude=-86.62" +
      "&current=temperature_2m,apparent_temperature,weather_code,is_day" +
      "&daily=temperature_2m_max,temperature_2m_min" +
      "&temperature_unit=fahrenheit" +
      "&timezone=America%2FChicago";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather request failed");

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    const weatherTypes = {
      0: ["Clear", "☀️"],
      1: ["Mostly clear", "🌤️"],
      2: ["Partly cloudy", "⛅"],
      3: ["Overcast", "☁️"],
      45: ["Foggy", "🌫️"],
      48: ["Foggy", "🌫️"],
      51: ["Light drizzle", "🌦️"],
      53: ["Drizzle", "🌦️"],
      55: ["Heavy drizzle", "🌧️"],
      56: ["Freezing drizzle", "🌧️"],
      57: ["Freezing drizzle", "🌧️"],
      61: ["Light rain", "🌧️"],
      63: ["Rain", "🌧️"],
      65: ["Heavy rain", "🌧️"],
      66: ["Freezing rain", "🌧️"],
      67: ["Freezing rain", "🌧️"],
      71: ["Light snow", "🌨️"],
      73: ["Snow", "🌨️"],
      75: ["Heavy snow", "❄️"],
      77: ["Snow grains", "❄️"],
      80: ["Rain showers", "🌦️"],
      81: ["Rain showers", "🌧️"],
      82: ["Heavy showers", "🌧️"],
      85: ["Snow showers", "🌨️"],
      86: ["Heavy snow showers", "❄️"],
      95: ["Thunderstorm", "⛈️"],
      96: ["Thunderstorm with hail", "⛈️"],
      99: ["Thunderstorm with hail", "⛈️"]
    };

    const [condition, icon] =
      weatherTypes[current.weather_code] || ["Current conditions", "🌡️"];

    const temperature = Math.round(current.temperature_2m);
    const high = Math.round(daily.temperature_2m_max[0]);
    const low = Math.round(daily.temperature_2m_min[0]);

    temp.textContent = `${temperature}°`;
    description.textContent = `${condition} · H ${high}° / L ${low}°`;
    art.textContent = icon;
    location.textContent = "Hendersonville, TN";

    $("clock-weather").textContent = `${temperature}° · ${condition}`;
  } catch (error) {
    description.textContent = "Weather temporarily unavailable";
    location.textContent = "Hendersonville, TN";
  }
}

updateWeather();
setInterval(updateWeather, 30 * 60 * 1000);

// BATTERY
if ("getBattery" in navigator) {
  navigator.getBattery().then(battery => {
    const render = () => {
      $("battery-value").textContent =
        `${Math.round(battery.level * 100)}%`;
      $("battery-caption").textContent =
        battery.charging ? "Charging" : "On battery";
    };

    render();
    battery.addEventListener("levelchange", render);
    battery.addEventListener("chargingchange", render);
  }).catch(() => {});
}

// OFFLINE SUPPORT
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
