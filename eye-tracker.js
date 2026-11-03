/* ══ Eye tracker (vanilla port of Bencho Watcher) ═══════════
   A ball with two eyes that watches your cursor, wherever it is
   on the page. Comments preserved from the React source — they
   say why the numbers are what they are.

   This site is static HTML, so the React component lives at
   components/EyeTracker.tsx and this file mounts the same toy
   into [data-eye-tracker] nodes without a build step. */

(function () {
  "use strict";

  /* Read once, the way the wheel and the pill nav do. A
     preference, not a live input. */
  var stillness = function () {
    return (
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  };

  var R = 50; /* the ball's radius, in the 100-unit viewBox */

  var STYLES = {
    Slant: { w: 9, h: 15, r: 4.5 },
    Dots: { w: 11, h: 11, r: 5.5 },
    Squares: { w: 12, h: 12, r: 3.5 },
  };
  /* half the gap between the eyes, as a fraction of the radius */
  var GAP = 0.19;
  /* how far a look to a corner tilts the pair, in degrees at the
     rim — a glance up and right leans them back, like the logo */
  var TILT = 64;

  var clamp = function (v, a, b) {
    return Math.min(b, Math.max(a, v));
  };

  var LINES = [
    "Hi welcome to my crib",
    "Boop.",
    "That tickles.",
    "Hi there!",
    "Stop poking me.",
    "Go do something else.",
    "How you doing?",
    "You found me!",
  ];
  var TINTS = ["#3b5bff", "#179c52", "#e0307f"];
  var KEY_MS = 38;
  var HOLD_MS = 1500;

  var SHAPES = {
    Ball: "M50 0 A50 50 0 1 1 49.99 0 Z",
    Circle: "M50 7 A43 43 0 1 1 49.99 7 Z",
    Cube: "M30 6 H70 A24 24 0 0 1 94 30 V70 A24 24 0 0 1 70 94 H30 A24 24 0 0 1 6 70 V30 A24 24 0 0 1 30 6 Z",
    Pill: "M34 17 H66 A33 33 0 0 1 66 83 H34 A33 33 0 0 1 34 17 Z",
    Hexagon:
      "M59.53 8.50 L81.18 21.00 Q90.70 26.50 90.70 37.50 L90.70 62.50 Q90.70 73.50 81.18 79.00 L59.53 91.50 Q50.00 97.00 40.47 91.50 L18.82 79.00 Q9.30 73.50 9.30 62.50 L9.30 37.50 Q9.30 26.50 18.82 21.00 L40.47 8.50 Q50.00 3.00 59.53 8.50 Z",
    "Hex flat":
      "M91.50 59.53 L79.00 81.18 Q73.50 90.70 62.50 90.70 L37.50 90.70 Q26.50 90.70 21.00 81.18 L8.50 59.53 Q3.00 50.00 8.50 40.47 L21.00 18.82 Q26.50 9.30 37.50 9.30 L62.50 9.30 Q73.50 9.30 79.00 18.82 L91.50 40.47 Q97.00 50.00 91.50 59.53 Z",
  };

  function mount(host, opts) {
    opts = opts || {};
    var follow = opts.follow != null ? opts.follow : 60;
    var bounce = opts.bounce != null ? opts.bounce : 30;
    var size = opts.size != null ? opts.size : 100;
    var shape = opts.shape || "Cube";
    var look = opts.eyes || "Slant";
    var eyeScale = opts.eyeScale != null ? opts.eyeScale : 1;
    var eyeWidth = opts.eyeWidth != null ? opts.eyeWidth : 1;
    var eyeRound = opts.eyeRound != null ? opts.eyeRound : 1;
    var eyeHeight = opts.eyeHeight != null ? opts.eyeHeight : 1;
    var idle = !!opts.idle;
    var within = opts.within;
    var still = stillness();

    var base = STYLES[look] || STYLES.Slant;
    var eyeNow = {
      w: base.w * eyeScale * eyeWidth,
      h: base.h * eyeScale * eyeHeight,
      r: base.r * eyeScale * eyeWidth * eyeRound,
    };
    var knobs = { follow: follow, bounce: bounce, eyeScale: eyeScale };
    var s = clamp(size, 16, 180);
    var body = SHAPES[shape] || SHAPES.Ball;
    var clipId = "eyt-clip-" + Math.random().toString(36).slice(2, 9);

    host.classList.add("eyt");
    if (opts.mark) host.classList.add("logo-test");
    host.style.setProperty("--eyt-size", s + "px");
    host.setAttribute("role", "img");
    host.setAttribute(
      "aria-label",
      "A ball with two eyes that follows the cursor"
    );

    host.innerHTML =
      '<svg class="eyt-ball" viewBox="0 0 100 100"' +
      (idle ? "" : ' data-poke="true"') +
      ">" +
      "<defs><clipPath id=\"" +
      clipId +
      '"><path d="' +
      body +
      '"></path></clipPath></defs>' +
      '<path class="eyt-body" d="' +
      body +
      '"></path>' +
      '<g clip-path="url(#' +
      clipId +
      ')">' +
      '<g class="eyt-eye-g"><rect class="eyt-eye" x="' +
      -eyeNow.w / 2 +
      '" y="' +
      -eyeNow.h / 2 +
      '" width="' +
      eyeNow.w +
      '" height="' +
      eyeNow.h +
      '" rx="' +
      eyeNow.r +
      '"></rect></g>' +
      '<g class="eyt-eye-g"><rect class="eyt-eye" x="' +
      -eyeNow.w / 2 +
      '" y="' +
      -eyeNow.h / 2 +
      '" width="' +
      eyeNow.w +
      '" height="' +
      eyeNow.h +
      '" rx="' +
      eyeNow.r +
      '"></rect></g>' +
      "</g></svg>" +
      (idle
        ? ""
        : '<span class="eyt-say" aria-live="polite"><span class="eyt-say__text"></span><span class="eyt-caret"></span></span>');

    var svg = host.querySelector(".eyt-ball");
    var eyes = host.querySelectorAll(".eyt-eye-g");
    var say = host.querySelector(".eyt-say");
    var sayText = host.querySelector(".eyt-say__text");

    var turn = 0;
    var lastLine = -1;
    var poke = function () {
      if (idle || !say || !sayText) return;
      var mine = ++turn;
      var pool = [];
      for (var i = 0; i < LINES.length; i++) {
        if (i !== lastLine) pool.push(i);
      }
      var pick = pool[Math.floor(Math.random() * pool.length)];
      lastLine = pick;
      var line = LINES[pick];
      var tint = TINTS[Math.floor(Math.random() * TINTS.length)];
      say.style.setProperty("--tint", tint);
      sayText.textContent = "";
      say.setAttribute("data-on", "");
      var k = 0;
      var typeNext = function () {
        if (mine !== turn) return;
        k += 1;
        sayText.textContent = line.slice(0, k);
        if (k < line.length) {
          setTimeout(typeNext, KEY_MS + Math.random() * 30);
        } else {
          setTimeout(function () {
            if (mine !== turn) return;
            say.removeAttribute("data-on");
          }, HOLD_MS);
        }
      };
      setTimeout(typeNext, KEY_MS);
    };
    if (!idle && svg) {
      svg.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        poke();
      });
    }

    /* where the face is on the ball (fractions of the radius),
       its speed, and where it is heading — one spring on a point,
       read as a turn when the eyes are drawn */
    var t = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    var raf = 0;
    var prev = 0;
    var blink = 0;
    var nextBlink = performance.now() + 2200;
    var seen = true;

    var draw = function (now) {
      /* a blink is 160ms down and up, as a squash on each eye */
      var lid = 1;
      if (now > nextBlink) {
        blink = now;
        nextBlink = now + (idle ? 2000 : 2600 + Math.random() * 3200);
      }
      var since = now - blink;
      if (since < 160) lid = 1 - 0.9 * Math.sin((since / 160) * Math.PI);

      var as = function (v) {
        return Math.asin(clamp(v, -0.92, 0.92));
      };
      var yaw = as(t.x);
      var pitch = -as(t.y);
      var cy = Math.cos(yaw),
        sy = Math.sin(yaw);
      var cp = Math.cos(pitch),
        sp = Math.sin(pitch);
      var tilt = TILT * t.x * t.y;
      var g0 = GAP * Math.max(1, knobs.eyeScale * 0.8);
      var xs = [-g0, g0];

      for (var i = 0; i < 2; i++) {
        var g = eyes[i];
        if (!g) continue;
        var x0 = xs[i];
        var z0 = Math.sqrt(1 - x0 * x0);
        var x1 = x0 * cy + z0 * sy;
        var z1 = -x0 * sy + z0 * cy;
        var y2 = -z1 * sp;
        var z2 = z1 * cp;
        var near = clamp(z2, 0, 1);
        var k = 0.45 + 0.55 * near;
        var sx = k * (0.7 + 0.3 * near);
        var e0 = eyeNow;
        var w = e0.w * sx;
        var h = Math.max(0.6, e0.h * k * lid);
        var rect = g.firstElementChild;
        if (rect) {
          rect.setAttribute("x", (-w / 2).toFixed(2));
          rect.setAttribute("y", (-h / 2).toFixed(2));
          rect.setAttribute("width", w.toFixed(2));
          rect.setAttribute("height", h.toFixed(2));
          rect.setAttribute(
            "rx",
            Math.min(e0.r, w / 2, h / 2).toFixed(2)
          );
        }
        g.setAttribute(
          "transform",
          "translate(" +
            (50 + x1 * R).toFixed(2) +
            " " +
            (50 + y2 * R).toFixed(2) +
            ") rotate(" +
            tilt.toFixed(2) +
            ")"
        );
        g.style.opacity = z2 < 0.05 ? "0" : "1";
      }
    };

    var tick = function (now) {
      if (!seen || document.hidden) {
        raf = 0;
        prev = 0;
        return;
      }
      var dt = prev ? Math.min(2.5, (now - prev) / 16.67) : 1;
      prev = now;
      if (still) {
        t.x = t.tx;
        t.y = t.ty;
      } else {
        var k = 0.06;
        var d = 0.34 - (clamp(knobs.bounce, 0, 100) / 100) * 0.22;
        t.vx += (t.tx - t.x) * k * dt - t.vx * d * dt;
        t.vy += (t.ty - t.y) * k * dt - t.vy * d * dt;
        t.x += t.vx * dt;
        t.y += t.vy * dt;
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    var resume = function () {
      if (!raf && seen && !document.hidden) raf = requestAnimationFrame(tick);
    };
    var io = new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      resume();
    });
    io.observe(host);
    document.addEventListener("visibilitychange", resume);

    var frame =
      host.closest(
        within || "body"
      ) || host;

    var aim = function (e) {
      var f = frame.getBoundingClientRect();
      if (
        e.clientX < f.left ||
        e.clientX > f.right ||
        e.clientY < f.top ||
        e.clientY > f.bottom
      ) {
        t.tx = 0;
        t.ty = 0;
        return;
      }
      var r = host.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      var dist = Math.hypot(dx, dy) || 1;
      var reach = Math.max(60, Math.min(f.width, f.height) * 0.28);
      var far = Math.min(
        0.85,
        Math.tanh(dist / reach) *
          (clamp(knobs.follow, 0, 100) / 100) *
          1.5
      );
      t.tx = (dx / dist) * far;
      t.ty = (dy / dist) * far;
    };
    var rest = function () {
      t.tx = 0;
      t.ty = 0;
    };

    if (idle) {
      var glance = 0;
      var lookAround = function () {
        var a = Math.random() * Math.PI * 2;
        var far = 0.45 + Math.random() * 0.25;
        t.tx = Math.cos(a) * far;
        t.ty = Math.sin(a) * far;
        glance = window.setTimeout(function () {
          rest();
          glance = window.setTimeout(lookAround, 5000 - 900);
        }, 900);
      };
      glance = window.setTimeout(lookAround, 5000);
    } else {
      window.addEventListener("pointermove", aim, { passive: true });
      document.documentElement.addEventListener("pointerleave", rest);
    }
  }

  function boot() {
    var nodes = document.querySelectorAll("[data-eye-tracker]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.dataset.eyeReady) continue;
      el.dataset.eyeReady = "1";
      mount(el, {
        size: parseFloat(el.dataset.size) || 36,
        shape: el.dataset.shape || "Cube",
        eyes: el.dataset.eyes || "Slant",
        follow: parseFloat(el.dataset.follow) || 70,
        bounce: parseFloat(el.dataset.bounce) || 30,
        idle: el.dataset.idle === "true",
        mark: el.dataset.mark !== "false",
        within: el.dataset.within || "body",
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
