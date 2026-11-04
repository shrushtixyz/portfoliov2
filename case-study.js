(function () {
  var nav = document.querySelector(".cs-sidebar__nav");

  if (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']"));
    var sections = links
      .map(function (link) {
        var id = link.getAttribute("href").slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    function setActive(id) {
      links.forEach(function (link) {
        var match = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-active", match);
        if (match) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    if (links.length && "IntersectionObserver" in window && sections.length) {
      var visible = new Map();

      var navObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              visible.set(entry.target.id, entry.intersectionRatio);
            } else {
              visible.delete(entry.target.id);
            }
          });

          var bestId = null;
          var bestRatio = -1;
          visible.forEach(function (ratio, id) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          });

          if (bestId) setActive(bestId);
        },
        {
          rootMargin: "-20% 0px -55% 0px",
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        }
      );

      sections.forEach(function (section) {
        navObserver.observe(section);
      });
    }

    if (sections[0]) setActive(sections[0].id);
  }

  var revealEls = Array.prototype.slice.call(
    document.querySelectorAll(".cs-hero, .cs-intro, .cs-section, .cs-section__note")
  );

  if (!revealEls.length) return;

  revealEls.forEach(function (el) {
    el.classList.add("cs-reveal");
  });

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-inview");
    });
    return;
  }

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.14,
    }
  );

  revealEls.forEach(function (el) {
    revealObserver.observe(el);
  });
})();
