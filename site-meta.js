(function () {
  var nodes = document.querySelectorAll("[data-sf-clock]");
  if (!nodes.length) return;

  function formatSF(date) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(date);
    var hour = "";
    var minute = "";
    var dayPeriod = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "hour") hour = parts[i].value;
      if (parts[i].type === "minute") minute = parts[i].value;
      if (parts[i].type === "dayPeriod") dayPeriod = parts[i].value.toUpperCase();
    }
    return "SF " + hour + ":" + minute + dayPeriod;
  }

  function tick() {
    var label = formatSF(new Date());
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = label;
  }

  tick();
  setInterval(tick, 30000);
})();
