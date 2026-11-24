const $ = (id) => document.getElementById(id);

function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: true});
  $("date").textContent = now.toLocaleDateString([], {month: "long", day: "numeric", year: "numeric"});
  $("day").textContent = now.toLocaleDateString([], {weekday: "long"});
  $("top-date").textContent = now.toLocaleDateString([], {weekday: "short", month: "short", day: "numeric"});
}
updateClock();
setInterval(updateClock, 1000);

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const target = $(`${page}-page`);
  if (target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("selected", el.dataset.page === page));
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-page]").forEach(el => {
  el.addEventListener("click", () => showPage(el.dataset.page));
});

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

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
