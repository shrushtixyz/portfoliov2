(function () {
  var section = document.getElementById("work");
  var dotsNav = document.querySelector(".work-dots");
  var items = Array.prototype.slice.call(document.querySelectorAll(".work-item[id]"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".work-dots__dot"));

  if (!section || !dotsNav || !items.length || !dots.length) return;

  var activeId = items[0].id;

  function setActive(id) {
    if (!id || id === activeId) {
      activeId = id || activeId;
    } else {
      activeId = id;
    }

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var isActive = dot.getAttribute("data-work-target") === activeId;
      dot.classList.toggle("is-active", isActive);
      if (isActive) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    }
  }

  function updateVisibility() {
    var rect = section.getBoundingClientRect();
    var inView = rect.top < window.innerHeight * 0.65 && rect.bottom > window.innerHeight * 0.25;
    if (inView) {
      dotsNav.hidden = false;
    } else {
      dotsNav.hidden = true;
    }
  }

  function updateActiveFromScroll() {
    var marker = window.innerHeight * 0.4;
    var current = items[0].id;

    for (var i = 0; i < items.length; i++) {
      var top = items[i].getBoundingClientRect().top;
      if (top <= marker) {
        current = items[i].id;
      }
    }

    setActive(current);
  }

  function onScroll() {
    updateVisibility();
    updateActiveFromScroll();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  for (var d = 0; d < dots.length; d++) {
    dots[d].addEventListener("click", function (e) {
      var id = this.getAttribute("data-work-target");
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      setActive(id);
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
})();
