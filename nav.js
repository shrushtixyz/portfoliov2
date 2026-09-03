(function () {
  var sidebar = document.querySelector(".sidebar");
  var toggle = document.querySelector(".nav-toggle");
  if (!sidebar || !toggle) return;

  function setOpen(open) {
    sidebar.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-lock", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", function () {
    setOpen(!sidebar.classList.contains("is-open"));
  });

  sidebar.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (link && sidebar.classList.contains("is-open")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();
