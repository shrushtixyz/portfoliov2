(function () {
  var viewport = document.getElementById("figma-viewport");
  var canvas = document.getElementById("whiteboard-canvas");

  if (!viewport || !canvas) return;

  function matchesSel(el, sel) {
    var fn = el.matches || el.webkitMatchesSelector || el.msMatchesSelector;
    return fn ? fn.call(el, sel) : false;
  }

  function closestFrom(el, sel) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (matchesSel(n, sel)) return n;
    }
    return null;
  }

  var BOARD_SCALE = 0.72;
  var CX = 1420;
  var CY = 950;
  var FIT_WIDTH = 2500;
  var FIT_HEIGHT = 1850;
  var SCALE_MIN = 0.5;
  var SCALE_MAX = 1.25;
  var ZOOM_BOOST = 1.02;

  var position = { x: 0, y: 0 };
  var draggingCanvas = false;
  var canvasStart = { x: 0, y: 0 };

  var draggingSticky = null;
  var stickyState = { mouseX: 0, mouseY: 0, left: 0, top: 0 };

  function viewportSize() {
    var r = viewport.getBoundingClientRect();
    if (r.width >= 4 && r.height >= 4) {
      return { width: r.width, height: r.height };
    }
    return null;
  }

  function computeBoardScale(width, height) {
    var availW = Math.max(120, width);
    var availH = Math.max(120, height);
    var scaleW = availW / FIT_WIDTH;
    var scaleH = availH / FIT_HEIGHT;
    var scale = Math.max(scaleW, scaleH) * ZOOM_BOOST;
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));
  }

  function applyTransform() {
    canvas.style.transform =
      "translate(" + position.x + "px, " + position.y + "px) scale(" + BOARD_SCALE + ")";
  }

  function parsePx(el, prop) {
    var v = el.style[prop];
    if (v) return parseFloat(v) || 0;
    var m = getComputedStyle(el)[prop].match(/^([\d.]+)px$/);
    return m ? parseFloat(m[1], 10) : 0;
  }

  function setSelected(el) {
    var prev = canvas.querySelectorAll(".board-draggable.is-selected");
    for (var i = 0; i < prev.length; i++) {
      prev[i].classList.remove("is-selected");
    }
    if (el) el.classList.add("is-selected");
  }

  viewport.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    if (closestFrom(e.target, "a")) return;

    var dragPiece = closestFrom(e.target, ".board-draggable");
    if (dragPiece) {
      e.preventDefault();
      setSelected(dragPiece);
      draggingSticky = dragPiece;
      dragPiece.classList.add("sticky-note--dragging");
      stickyState.mouseX = e.clientX;
      stickyState.mouseY = e.clientY;
      stickyState.left = parsePx(dragPiece, "left");
      stickyState.top = parsePx(dragPiece, "top");
      viewport.classList.add("is-dragging");
      return;
    }

    setSelected(null);
    draggingCanvas = true;
    canvasStart.x = e.clientX - position.x;
    canvasStart.y = e.clientY - position.y;
    viewport.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", function (e) {
    if (draggingSticky) {
      var dx = (e.clientX - stickyState.mouseX) / BOARD_SCALE;
      var dy = (e.clientY - stickyState.mouseY) / BOARD_SCALE;
      draggingSticky.style.left = stickyState.left + dx + "px";
      draggingSticky.style.top = stickyState.top + dy + "px";
      return;
    }
    if (!draggingCanvas) return;
    position.x = e.clientX - canvasStart.x;
    position.y = e.clientY - canvasStart.y;
    applyTransform();
  });

  function endDrag() {
    if (draggingSticky) {
      draggingSticky.classList.remove("sticky-note--dragging");
      draggingSticky = null;
    }
    draggingCanvas = false;
    viewport.classList.remove("is-dragging");
  }

  window.addEventListener("mouseup", endDrag);

  window.addEventListener("mouseleave", function () {
    if (draggingCanvas || draggingSticky) endDrag();
  });

  // Touch support
  viewport.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) return;
      if (closestFrom(e.target, "a")) return;
      var t = e.touches[0];
      var dragPiece = closestFrom(e.target, ".board-draggable");

      if (dragPiece) {
        e.preventDefault();
        setSelected(dragPiece);
        draggingSticky = dragPiece;
        dragPiece.classList.add("sticky-note--dragging");
        stickyState.mouseX = t.clientX;
        stickyState.mouseY = t.clientY;
        stickyState.left = parsePx(dragPiece, "left");
        stickyState.top = parsePx(dragPiece, "top");
        viewport.classList.add("is-dragging");
        return;
      }

      setSelected(null);
      draggingCanvas = true;
      canvasStart.x = t.clientX - position.x;
      canvasStart.y = t.clientY - position.y;
      viewport.classList.add("is-dragging");
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];

      if (draggingSticky) {
        e.preventDefault();
        var dx = (t.clientX - stickyState.mouseX) / BOARD_SCALE;
        var dy = (t.clientY - stickyState.mouseY) / BOARD_SCALE;
        draggingSticky.style.left = stickyState.left + dx + "px";
        draggingSticky.style.top = stickyState.top + dy + "px";
        return;
      }
      if (!draggingCanvas) return;
      e.preventDefault();
      position.x = t.clientX - canvasStart.x;
      position.y = t.clientY - canvasStart.y;
      applyTransform();
    },
    { passive: false }
  );

  window.addEventListener("touchend", endDrag);
  window.addEventListener("touchcancel", endDrag);

  function centerOnLoad() {
    var size = viewportSize();
    if (!size) {
      requestAnimationFrame(centerOnLoad);
      return;
    }

    BOARD_SCALE = computeBoardScale(size.width, size.height);
    position.x = size.width / 2 - BOARD_SCALE * CX;
    position.y = size.height / 2 - BOARD_SCALE * CY;
    applyTransform();
  }

  function scheduleCenter() {
    if (draggingCanvas || draggingSticky) return;
    requestAnimationFrame(function () {
      centerOnLoad();
      requestAnimationFrame(centerOnLoad);
    });
  }

  function bindImageRecenter() {
    var imgs = canvas.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.complete) {
        img.addEventListener("load", scheduleCenter, { once: true });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      scheduleCenter();
      bindImageRecenter();
    });
  } else {
    scheduleCenter();
    bindImageRecenter();
  }

  window.addEventListener("load", function () {
    scheduleCenter();
    window.setTimeout(scheduleCenter, 120);
    window.setTimeout(scheduleCenter, 400);
  });

  window.addEventListener("resize", scheduleCenter);

  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(function () {
      scheduleCenter();
    });
    ro.observe(viewport);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleCenter);
  }

  var sfClockTime = document.getElementById("sf-clock-time");
  var sfClockIcon = document.getElementById("sf-clock-icon");

  function updateSanFranciscoClock() {
    if (!sfClockTime) return;

    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(new Date());
    var hour = "";
    var minute = "";
    var dayPeriod = "";

    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "hour") hour = parts[i].value;
      if (parts[i].type === "minute") minute = parts[i].value;
      if (parts[i].type === "dayPeriod") dayPeriod = parts[i].value;
    }

    sfClockTime.textContent = hour + ":" + minute + dayPeriod;

    if (sfClockIcon) {
      var hour24 = Number(hour);
      if (dayPeriod === "PM" && hour24 !== 12) hour24 += 12;
      if (dayPeriod === "AM" && hour24 === 12) hour24 = 0;
      var isDaytime = hour24 >= 7 && hour24 < 19;
      sfClockIcon.classList.toggle("is-sun", isDaytime);
      sfClockIcon.classList.toggle("is-moon", !isDaytime);
    }
  }

  updateSanFranciscoClock();
  window.setInterval(updateSanFranciscoClock, 15000);

  var galleryImages = canvas.querySelectorAll(".board-gallery__image");
  var galleryIndex = 0;
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showNextGalleryImage() {
    if (galleryImages.length < 2) return;
    galleryImages[galleryIndex].classList.remove("is-active");
    galleryIndex = (galleryIndex + 1) % galleryImages.length;
    galleryImages[galleryIndex].classList.add("is-active");
  }

  if (!reduceMotion) {
    window.setInterval(showNextGalleryImage, 3200);
  }

  var musicWidget = canvas.querySelector(".board-music");
  var musicCover = canvas.querySelector(".board-music__cover");
  var musicTitle = canvas.querySelector(".board-music__title");
  var musicArtist = canvas.querySelector(".board-music__artist");
  var musicTracks = [
    { title: "Paradise", artist: "Sade", cover: "assets/sade.png" },
    { title: "RAIN", artist: "Fisher", cover: "assets/fisher.png" },
    {
      title: "Delilah (pull me out of this)",
      artist: "Fred again..",
      cover: "assets/fredgain.png",
    },
  ];
  var musicIndex = 0;

  function showNextTrack() {
    if (!musicWidget || !musicCover || !musicTitle || !musicArtist) return;
    musicWidget.classList.add("is-changing");

    window.setTimeout(function () {
      musicIndex = (musicIndex + 1) % musicTracks.length;
      var track = musicTracks[musicIndex];
      musicCover.src = track.cover;
      musicTitle.textContent = track.title;
      musicArtist.textContent = track.artist;
      musicWidget.setAttribute(
        "aria-label",
        "Now playing " + track.title + " by " + track.artist
      );
      musicWidget.classList.remove("is-changing");
    }, 550);
  }

  if (!reduceMotion && musicWidget) {
    window.setInterval(showNextTrack, 7000);
  }

  window.portfolioRecenterBoard = scheduleCenter;
})();
