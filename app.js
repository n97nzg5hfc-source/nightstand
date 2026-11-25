
const $ = id => document.getElementById(id);

// CLOCK
function updateClock() {
  const now = new Date();

  $("clock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
  document.querySelectorAll(".page").forEach(el => {
    el.classList.remove("active");
  });

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

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=36.3048&longitude=-86.62&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FChicago";

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

    const [condition, emoji] =
      weatherTypes[current.weather_code] || ["Unknown", "🌡️"];

    temp.textContent = `${temperature}°`;
    description.textContent = condition;
    icon.textContent = emoji;

    const foot = document.querySelector(".weather-foot");
    if (foot) {
      foot.innerHTML =
        `<span>H: ${high}° &nbsp; L: ${low}°</span><strong>Hendersonville, TN</strong>`;
    }
  } catch (error) {
    if (description) description.textContent = "Weather unavailable";
    if (location) location.textContent = "Check internet connection";
  }
}

updateWeather();
setInterval(updateWeather, 30 * 60 * 1000);

// ALARM SYSTEM
const ALARM_KEY = "nightstand-alarms";
let alarms = [];

try {
  alarms = JSON.parse(localStorage.getItem(ALARM_KEY) || "[]");
  if (!Array.isArray(alarms)) alarms = [];
} catch {
  alarms = [];
}

let audioContext = null;
let alarmAudioTimer = null;
let activeAlarm = null;
let lastTriggeredMinute = "";
let snoozeUntil = null;
let snoozedAlarm = null;
let editingAlarmId = null;

function saveAlarms() {
  localStorage.setItem(ALARM_KEY, JSON.stringify(alarms));
}

function getDaysText(days) {
  if (!days || days.length === 0) return "One time";
  if (days.length === 7) return "Every day";

  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every(day => days.includes(day))
  ) return "Weekdays";

  if (
    days.length === 2 &&
    days.includes(0) &&
    days.includes(6)
  ) return "Weekends";

  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.slice().sort((a, b) => a - b)
    .map(day => names[day]).join(", ");
}

function updateNextAlarm() {
  const enabled = alarms.filter(alarm => alarm.enabled);
  const alarmValue = $("alarm-value");
  const alarmCaption = $("alarm-caption");

  if (!enabled.length) {
    if (alarmValue) alarmValue.textContent = "--:--";
    if (alarmCaption) alarmCaption.textContent = "No alarm scheduled";
    return;
  }

  const now = new Date();
  let nextAlarm = null;
  let nextTime = Infinity;

  enabled.forEach(alarm => {
    const [hours, minutes] = alarm.time.split(":").map(Number);

    for (let offset = 0; offset < 8; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(hours, minutes, 0, 0);

      const day = candidate.getDay();
      const dayMatches = !alarm.days.length || alarm.days.includes(day);

      if (dayMatches && candidate.getTime() > now.getTime()) {
        if (candidate.getTime() < nextTime) {
          nextTime = candidate.getTime();
          nextAlarm = { alarm, date: candidate };
        }
        break;
      }
    }
  });

  if (!nextAlarm) {
    if (alarmValue) alarmValue.textContent = "--:--";
    if (alarmCaption) alarmCaption.textContent = "No upcoming alarm";
    return;
  }

  const display = nextAlarm.date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  if (alarmValue) alarmValue.textContent = display;

  if (alarmCaption) {
    alarmCaption.textContent =
      `${nextAlarm.alarm.name} · ${getDaysText(nextAlarm.alarm.days)}`;
  }
}

// ALARM EDITING CONTROLS
const addButton = $("add-alarm");

const cancelEditButton = document.createElement("button");
cancelEditButton.type = "button";
cancelEditButton.textContent = "Cancel editing";
cancelEditButton.hidden = true;
cancelEditButton.style.cssText =
  "min-height:44px;padding:12px;border:1px solid #50647e;border-radius:10px;background:#172840;color:white;cursor:pointer;";

addButton.insertAdjacentElement("afterend", cancelEditButton);

function resetAlarmForm() {
  editingAlarmId = null;
  addButton.textContent = "+ Add alarm";
  cancelEditButton.hidden = true;
  $("alarm-name").value = "";

  document.querySelectorAll(".alarm-days input").forEach(input => {
    input.checked = false;
  });
}

cancelEditButton.addEventListener("click", resetAlarmForm);

function startEditingAlarm(alarm) {
  editingAlarmId = alarm.id;
  $("alarm-time").value = alarm.time;
  $("alarm-name").value = alarm.name || "";
  $("alarm-sound").value = alarm.sound || "gentle";
  $("alarm-gradual").checked = alarm.gradual !== false;

  const selectedDays = alarm.days || [];

  document.querySelectorAll(".alarm-days input").forEach(input => {
    input.checked = selectedDays.includes(Number(input.value));
  });

  addButton.textContent = "Save changes";
  cancelEditButton.hidden = false;

  showPage("alarms");

  $("alarm-time").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// RENDER ALARMS
function renderAlarms() {
  const list = $("alarm-list");

  if (!alarms.length) {
    list.innerHTML = '<p class="muted">No alarms created yet.</p>';
    updateNextAlarm();
    return;
  }

  list.innerHTML = "";

  alarms.forEach(alarm => {
    const card = document.createElement("div");
    card.className = "alarm-card";

    const info = document.createElement("div");
    const time = document.createElement("strong");
    const [hours, minutes] = alarm.time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    time.textContent = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });

    const details = document.createElement("div");
    details.className = "muted";
    details.textContent =
      `${alarm.name} · ${getDaysText(alarm.days)} · ${alarm.sound}`;

    info.append(time, details);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "7px";
    actions.style.alignItems = "center";
    actions.style.flexWrap = "wrap";

    const toggleLabel = document.createElement("label");
    toggleLabel.style.display = "flex";
    toggleLabel.style.alignItems = "center";
    toggleLabel.style.gap = "5px";
    toggleLabel.style.fontSize = "11px";
    toggleLabel.style.color = "#b7c6da";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = alarm.enabled;
    toggle.setAttribute("aria-label", "Enable alarm");

    toggle.addEventListener("change", () => {
      alarm.enabled = toggle.checked;
      saveAlarms();
      renderAlarms();
    });

    toggleLabel.append(toggle, document.createTextNode("On"));

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEditingAlarm(alarm));

    const remove = document.createElement("button");
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      if (editingAlarmId === alarm.id) resetAlarmForm();

      alarms = alarms.filter(item => item.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });

    actions.append(toggleLabel, edit, remove);
    card.append(info, actions);
    list.append(card);
  });

  updateNextAlarm();
}

// ADD OR SAVE ALARM
addButton.addEventListener("click", async () => {
  const time = $("alarm-time").value;
  const name = $("alarm-name").value.trim() || "Alarm";
  const sound = $("alarm-sound").value;
  const gradual = $("alarm-gradual").checked;

  if (!time) {
    alert("Please choose an alarm time.");
    return;
  }

  const days = Array.from(
    document.querySelectorAll(".alarm-days input:checked")
  ).map(input => Number(input.value));

  try {
    const Audio = window.AudioContext || window.webkitAudioContext;

    if (Audio && !audioContext) audioContext = new Audio();

    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch {}

  if (editingAlarmId !== null) {
    const existingAlarm = alarms.find(
      alarm => alarm.id === editingAlarmId
    );

    if (existingAlarm) {
      existingAlarm.time = time;
      existingAlarm.name = name;
      existingAlarm.sound = sound;
      existingAlarm.gradual = gradual;
      existingAlarm.days = days;
    }

    resetAlarmForm();
  } else {
    alarms.push({
      id: Date.now().toString(),
      time,
      name,
      sound,
      gradual,
      days,
      enabled: true
    });

    resetAlarmForm();
  }

  saveAlarms();
  renderAlarms();
});

// ALARM SOUND
function stopAlarmSound() {
  if (alarmAudioTimer) {
    clearInterval(alarmAudioTimer);
    alarmAudioTimer = null;
  }

  activeAlarm = null;
}

function playAlarmSound(alarm) {
  stopAlarmSound();

  if (!audioContext) return;

  activeAlarm = alarm;

  const start = Date.now();
  let note = 0;

  const patterns = {
    gentle: [523, 659, 784],
    digital: [880, 660, 880, 1046],
    classic: [659, 784, 988, 784]
  };

  const pattern = patterns[alarm.sound] || patterns.gentle;

  function playNote() {
    if (!activeAlarm || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = alarm.sound === "digital" ? "square" : "sine";
    oscillator.frequency.value = pattern[note % pattern.length];

    const elapsed = Date.now() - start;
    const volume = alarm.gradual
      ? Math.min(0.75, 0.08 + (elapsed / 30000) * 0.67)
      : 0.4;

    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(
      volume,
      audioContext.currentTime + 0.08
    );

    gain.gain.setTargetAtTime(
      0,
      audioContext.currentTime + 0.6,
      0.12
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.9);

    note++;
  }

  playNote();
  alarmAudioTimer = setInterval(playNote, 1000);
}

// ALARM ALERT
function showAlarmAlert(alarm) {
  const oldOverlay = $("nightstand-alarm-alert");
  if (oldOverlay) oldOverlay.remove();

  const overlay = document.createElement("div");
  overlay.id = "nightstand-alarm-alert";

  overlay.style.cssText = `
    position:fixed;inset:0;z-index:1000;
    background:rgba(4,9,17,.96);
    display:flex;align-items:center;justify-content:center;
    padding:25px;text-align:center;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    max-width:400px;width:100%;
    padding:35px 25px;border:1px solid #526987;
    border-radius:20px;background:#14243a;
  `;

  const heading = document.createElement("div");
  heading.textContent = "WAKE UP";
  heading.style.cssText =
    "font-size:12px;letter-spacing:.25em;color:#a9c0df;";

  const title = document.createElement("h1");
  title.textContent = alarm.name;
  title.style.cssText = "font-size:34px;font-weight:400;margin:18px 0;";

  const message = document.createElement("p");
  message.textContent = "Your alarm is going off.";
  message.style.color = "#aebdd1";

  const snooze = document.createElement("button");
  snooze.textContent = "SNOOZE · 10 MIN";
  snooze.style.cssText =
    "padding:15px;margin:12px 5px;border:1px solid #8ca9cf;border-radius:10px;background:#8ca9cf;color:#091321;font-weight:bold;";

  const dismiss = document.createElement("button");
  dismiss.textContent = "DISMISS";
  dismiss.style.cssText =
    "padding:15px;margin:12px 5px;border:1px solid #50647e;border-radius:10px;background:#172840;color:white;font-weight:bold;";

  snooze.addEventListener("click", () => {
    snoozedAlarm = alarm;
    snoozeUntil = Date.now() + 10 * 60 * 1000;
    stopAlarmSound();
    overlay.remove();
  });

  dismiss.addEventListener("click", () => {
    stopAlarmSound();

    snoozeUntil = null;
    snoozedAlarm = null;

    overlay.remove();

    if (!alarm.days.length) {
      alarm.enabled = false;
      saveAlarms();
      renderAlarms();
    }
  });

  box.append(heading, title, message, snooze, dismiss);
  overlay.append(box);
  document.body.append(overlay);
}

// CHECK ALARMS
function checkAlarms() {
  const now = new Date();

  const minuteKey =
    `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

  if (snoozeUntil && Date.now() >= snoozeUntil) {
    const alarmToRestart = snoozedAlarm;

    snoozeUntil = null;
    snoozedAlarm = null;

    if (alarmToRestart) {
      playAlarmSound(alarmToRestart);
      showAlarmAlert(alarmToRestart);
    }
  }

  if (lastTriggeredMinute === minuteKey) return;
  lastTriggeredMinute = minuteKey;

  if (activeAlarm || snoozeUntil) return;

  const today = now.getDay();

  const currentTime =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const due = alarms.find(alarm =>
    alarm.enabled &&
    alarm.time === currentTime &&
    (!alarm.days.length || alarm.days.includes(today))
  );

  if (!due) return;

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  playAlarmSound(due);
  showAlarmAlert(due);
}

setInterval(checkAlarms, 1000);
renderAlarms();

// NEWS
const NEWS_EDITION = "hl=en-US&gl=US&ceid=US:en";

const NEWS_CATEGORIES = {
  World: "WORLD",
  US: "NATION",
  Technology: "TECHNOLOGY",
  Science: "SCIENCE",
  Sports: "SPORTS"
};

const NEWS_CACHE = {};
let currentNewsCategory = "World";
let newsLoading = false;

function newsFeedUrl(category) {
  if (category === "Top Stories") {
    return `https://news.google.com/rss?${NEWS_EDITION}`;
  }

  const topic = NEWS_CATEGORIES[category];

  return `https://news.google.com/rss/headlines/section/topic/${topic}?${NEWS_EDITION}`;
}

async function fetchNews(category) {
  const feed = newsFeedUrl(category);
  const api =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(feed);

  const response = await fetch(api, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("News request failed");
  }

  const data = await response.json();

  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("News feed unavailable");
  }

  return data.items;
}

function makeNewsLink(item, compact = false) {
  const link = document.createElement("a");

  link.href = item.link || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.title || "Untitled story";

  link.style.cssText = compact
    ? "display:block;color:#e6edf7;text-decoration:none;font-size:14px;line-height:1.4;padding:9px 0;border-bottom:1px solid #26364e;"
    : "display:block;color:#e6edf7;text-decoration:none;font-size:17px;line-height:1.45;padding:16px 0;border-bottom:1px solid #26364e;";

  return link;
}

function createNewsLayout() {
  const newsPage = $("news-page");
  if (!newsPage) return;

  const comingCard = newsPage.querySelector(".coming-card");
  if (!comingCard) return;

  const layout = document.createElement("div");
  layout.id = "news-interface";

  layout.innerHTML = `
    <div id="news-categories"
      style="display:flex;flex-wrap:wrap;gap:8px;margin:22px 0;">
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <strong id="news-heading" style="font-size:17px;">World News</strong>
      <button id="news-refresh" type="button"
        style="padding:9px 13px;border:1px solid #50647e;border-radius:9px;background:#172840;color:white;">
        Refresh
      </button>
    </div>
    <div id="news-list">
      <p class="muted">Loading headlines...</p>
    </div>
  `;

  comingCard.replaceWith(layout);

  const categories = $("news-categories");

  Object.keys(NEWS_CATEGORIES).forEach(category => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = category;
    button.dataset.category = category;

    button.style.cssText =
      "padding:9px 13px;border:1px solid #50647e;border-radius:20px;background:#172840;color:#dce6f5;";

    button.addEventListener("click", () => {
      loadNews(category, true);
    });

    categories.append(button);
  });

  $("news-refresh").addEventListener("click", () => {
    loadNews(currentNewsCategory, true);
  });

  loadNews("World");
}

async function loadNews(category, forceRefresh = false) {
  if (newsLoading) return;

  newsLoading = true;
  currentNewsCategory = category;

  const list = $("news-list");
  const heading = $("news-heading");

  if (!list || !heading) {
    newsLoading = false;
    return;
  }

  heading.textContent = `${category} News`;

  document.querySelectorAll("#news-categories button").forEach(button => {
    const selected = button.dataset.category === category;

    button.style.background = selected ? "#526987" : "#172840";
    button.style.borderColor = selected ? "#9bb7dc" : "#50647e";
  });

  if (!forceRefresh && NEWS_CACHE[category] &&
      Date.now() - NEWS_CACHE[category].time < 10 * 60 * 1000) {
    displayNews(list, NEWS_CACHE[category].items);
    newsLoading = false;
    return;
  }

  list.innerHTML = '<p class="muted">Loading headlines...</p>';

  try {
    const items = await fetchNews(category);

    NEWS_CACHE[category] = {
      items,
      time: Date.now()
    };

    displayNews(list, items);
  } catch (error) {
    list.innerHTML = `
      <p class="muted">
        News couldn't load right now. Check your internet connection
        and try Refresh.
      </p>
    `;
  }

  newsLoading = false;
}

function displayNews(container, items) {
  container.innerHTML = "";

  if (!items || !items.length) {
    container.innerHTML = '<p class="muted">No headlines found.</p>';
    return;
  }

  items.slice(0, 15).forEach(item => {
    container.append(makeNewsLink(item));
  });
}

// HOME PAGE TOP STORIES
async function loadHomeNews() {
  const widget = document.querySelector(".news-placeholder");
  if (!widget) return;

  const description = widget.parentElement.querySelector(".muted");

  try {
    const items = await fetchNews("Top Stories");

    widget.innerHTML = "";
    widget.style.display = "block";

    items.slice(0, 3).forEach(item => {
      widget.append(makeNewsLink(item, true));
    });

    if (description) {
      description.textContent = "Latest headlines · Tap a story to read";
    }
  } catch (error) {
    if (description) {
      description.textContent = "Headlines are temporarily unavailable.";
    }
  }
}

createNewsLayout();
loadHomeNews();

setInterval(() => {
  loadHomeNews();

  if ($("news-page")?.classList.contains("active")) {
    loadNews(currentNewsCategory, true);
  }
}, 15 * 60 * 1000);

// SERVICE WORKER
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
