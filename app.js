
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

    const [condition, emoji] =
      weatherTypes[current.weather_code] || ["Unknown", "🌡️"];

    temp.textContent = `${temperature}°`;
    description.textContent = condition;
    icon.textContent = emoji;
    location.textContent = "Hendersonville, TN";

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
  return days.sort((a, b) => a - b).map(day => names[day]).join(", ");
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

    edit.addEventListener("click", () => {
      startEditingAlarm(alarm);
    });

    const remove = document.createElement("button");
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      if (editingAlarmId === alarm.id) {
        resetAlarmForm();
      }

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

  let start = Date.now();
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

// SERVICE WORKER
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// =====================================
// NIGHTSTAND LIVE NEWS
// =====================================

const NEWS_PROXY = "https://proxy.cors.dev/";
const NEWS_EDITION = "?hl=en-US&gl=US&ceid=US:en";

const NEWS_CATEGORIES = {
  "World": "WORLD",
  "US": "NATION",
  "Technology": "TECHNOLOGY",
  "Science": "SCIENCE",
  "Sports": "SPORTS"
};

let currentNewsCategory = "World";
let newsCache = {};
let newsLoading = false;

const newsPage = $("news-page");
const newsSection = newsPage.querySelector(".section-page");
const newsComingCard = newsSection.querySelector(".coming-card");

const newsControls = document.createElement("div");
newsControls.id = "news-controls";
newsControls.style.cssText =
  "display:flex;flex-wrap:wrap;gap:9px;margin:28px 0 20px;";

const newsList = document.createElement("div");
newsList.id = "news-list";
newsList.style.cssText =
  "display:flex;flex-direction:column;gap:12px;";

const newsRefresh = document.createElement("button");
newsRefresh.textContent = "↻ Refresh news";
newsRefresh.style.cssText =
  "margin:0 0 20px;padding:11px 15px;border:1px solid #41536b;border-radius:9px;background:#172840;color:#dce7f5;";

newsComingCard.replaceWith(newsControls, newsRefresh, newsList);

function createNewsButton(label, selected) {
  const button = document.createElement("button");
  button.textContent = label;
  button.style.cssText = `
    padding:11px 15px;
    border:1px solid ${selected ? "#9bb7dc" : "#344963"};
    border-radius:9px;
    background:${selected ? "#263d5b" : "#122139"};
    color:#f4f7fc;
    font-size:12px;
  `;

  button.addEventListener("click", () => {
    currentNewsCategory = label;
    renderNewsButtons();
    loadNews(label);
  });

  return button;
}

function renderNewsButtons() {
  newsControls.replaceChildren();

  Object.keys(NEWS_CATEGORIES).forEach(category => {
    newsControls.append(
      createNewsButton(category, category === currentNewsCategory)
    );
  });
}

function createNewsCard(article) {
  const card = document.createElement("article");

  card.style.cssText = `
    padding:19px;
    border:1px solid #2b3d56;
    border-radius:13px;
    background:linear-gradient(145deg,#101d31,#0c1728);
  `;

  const title = document.createElement("a");
  title.textContent = article.title;
  title.href = article.link;
  title.target = "_blank";
  title.rel = "noopener noreferrer";
  title.style.cssText = `
    display:block;
    color:#edf4fc;
    font-size:16px;
    font-weight:600;
    line-height:1.4;
    text-decoration:none;
  `;

  const details = document.createElement("div");
  details.textContent = [
    article.source,
    article.date
  ].filter(Boolean).join(" · ");

  details.style.cssText =
    "margin-top:10px;color:#98a8bf;font-size:11px;";

  const readMore = document.createElement("a");
  readMore.href = article.link;
  readMore.target = "_blank";
  readMore.rel = "noopener noreferrer";
  readMore.textContent = "READ STORY ↗";
  readMore.style.cssText = `
    display:inline-block;
    margin-top:13px;
    color:#a9c0df;
    font-size:10px;
    font-weight:700;
    letter-spacing:.1em;
    text-decoration:none;
  `;

  card.append(title, details, readMore);
  return card;
}

async function getNewsFeed(feedUrl) {
  const response = await fetch(NEWS_PROXY + feedUrl);

  if (!response.ok) {
    throw new Error("News feed request failed");
  }

  const xml = new DOMParser().parseFromString(
    await response.text(),
    "text/xml"
  );

  const root = xml.documentElement;

  if (
    !["rss", "feed", "RDF"].includes(root.localName) ||
    xml.querySelector("parsererror")
  ) {
    throw new Error("Invalid news feed");
  }

  const isAtom = root.localName === "feed";
  const items = [...root.querySelectorAll(
    isAtom ? "entry" : "item"
  )];

  return items.map(item => {
    const title = item.querySelector("title")?.textContent?.trim() || "";

    let link = "";

    if (isAtom) {
      link =
        item.querySelector('link[rel="alternate"]')?.getAttribute("href") ||
        item.querySelector("link")?.getAttribute("href") ||
        "";
    } else {
      link = item.querySelector("link")?.textContent?.trim() || "";
    }

    const source = item.querySelector("source")?.textContent?.trim() || "";

    const dateText =
      item.querySelector("pubDate")?.textContent?.trim() ||
      item.querySelector("published")?.textContent?.trim() ||
      item.querySelector("updated")?.textContent?.trim() ||
      "";

    const date = dateText
      ? new Date(dateText).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })
      : "";

    return { title, link, source, date };
  }).filter(article => article.title && article.link);
}

async function loadNews(category, forceRefresh = false) {
  if (newsLoading) return;

  const cached = newsCache[category];

  if (
    !forceRefresh &&
    cached &&
    Date.now() - cached.time < 10 * 60 * 1000
  ) {
    displayNews(cached.articles);
    return;
  }

  newsLoading = true;
  newsList.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = "Loading the latest headlines…";
  loading.className = "muted";
  newsList.append(loading);

  try {
    const topic = NEWS_CATEGORIES[category];

    const feedUrl =
      `https://news.google.com/rss/headlines/section/topic/${topic}${NEWS_EDITION}`;

    const articles = await getNewsFeed(feedUrl);

    newsCache[category] = {
      articles,
      time: Date.now()
    };

    displayNews(articles);
  } catch (error) {
    newsList.replaceChildren();

    const message = document.createElement("p");
    message.className = "muted";
    message.textContent =
      "News could not load. Check your internet connection and try refreshing.";

    newsList.append(message);
  } finally {
    newsLoading = false;
  }
}

function displayNews(articles) {
  newsList.replaceChildren();

  if (!articles.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No headlines are available right now.";
    newsList.append(empty);
    return;
  }

  articles.forEach(article => {
    newsList.append(createNewsCard(article));
  });
}

// HOME DASHBOARD TOP STORIES
async function updateHomeNews() {
  const homeNews = document.querySelector(".news");
  if (!homeNews) return;

  const placeholder = homeNews.querySelector(".news-placeholder");
  const description = homeNews.querySelector(".muted");

  try {
    const feedUrl =
      `https://news.google.com/rss?${NEWS_EDITION.slice(1)}`;

    const articles = await getNewsFeed(feedUrl);

    if (placeholder) placeholder.remove();

    const headlineArea = document.createElement("div");
    headlineArea.style.cssText =
      "display:flex;flex-direction:column;gap:10px;margin-top:15px;";

    articles.slice(0, 3).forEach(article => {
      const link = document.createElement("a");
      link.textContent = article.title;
      link.href = article.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.cssText = `
        color:#dce7f5;
        font-size:12px;
        line-height:1.4;
        text-decoration:none;
      `;
      headlineArea.append(link);
    });

    if (description) description.remove();

    const oldHeadlines = homeNews.querySelector(".home-news-headlines");
    if (oldHeadlines) oldHeadlines.remove();

    headlineArea.className = "home-news-headlines";
    homeNews.append(headlineArea);
  } catch (error) {
    if (description) {
      description.textContent = "News temporarily unavailable.";
    }
  }
}

newsRefresh.addEventListener("click", () => {
  loadNews(currentNewsCategory, true);
});

renderNewsButtons();
loadNews("World");
updateHomeNews();

// Refresh news every 15 minutes
setInterval(() => {
  loadNews(currentNewsCategory, true);
  updateHomeNews();
}, 15 * 60 * 1000);
