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
  var CX = 1320;
  var CY = 760;
  var FIT_WIDTH = 2000;
  var FIT_HEIGHT = 1500;
  var VIEWPORT_FILL = 1;
  var SCALE_MIN = 0.28;
  var SCALE_MAX = 1;
  var ZOOM_BOOST = 1.44;
  var MOBILE_MAX = 900;
  var MOBILE_FIT_WIDTH = 720;
  var MOBILE_FIT_HEIGHT = 780;
  var MOBILE_ZOOM_BOOST = 2.35;
  var MOBILE_SCALE_MAX = 1.55;
  var MOBILE_CX = 1320;
  var MOBILE_CY = 820;

  var position = { x: 0, y: 0 };
  var draggingCanvas = false;
  var canvasStart = { x: 0, y: 0 };

  var draggingSticky = null;
  var stickyState = { mouseX: 0, mouseY: 0, left: 0, top: 0 };
  var stickyDragMoved = false;
  var DRAG_CLICK_THRESHOLD = 8;

  function isMobileBoard() {
    return window.matchMedia("(max-width: " + MOBILE_MAX + "px)").matches;
  }

  function viewportSize() {
    var r = viewport.getBoundingClientRect();
    if (r.width >= 4 && r.height >= 4) {
      return { width: r.width, height: r.height };
    }
    return null;
  }

  function computeBoardScale(width, height) {
    var mobile = isMobileBoard();
    var pad = mobile ? 20 : 48;
    var fitW = mobile ? MOBILE_FIT_WIDTH : FIT_WIDTH;
    var fitH = mobile ? MOBILE_FIT_HEIGHT : FIT_HEIGHT;
    var boost = mobile ? MOBILE_ZOOM_BOOST : ZOOM_BOOST;
    var scaleMax = mobile ? MOBILE_SCALE_MAX : SCALE_MAX;
    var availW = Math.max(120, width - pad);
    var availH = Math.max(120, height - pad);
    var targetW = availW * VIEWPORT_FILL;
    var targetH = availH * VIEWPORT_FILL;
    var scaleW = targetW / fitW;
    var scaleH = targetH / fitH;
    var scale = Math.min(scaleW, scaleH) * boost;
    return Math.max(SCALE_MIN, Math.min(scaleMax, scale));
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

  function zoomBoard(direction) {
    var size = viewportSize();
    if (!size) return;
    var oldScale = BOARD_SCALE;
    var factor = direction > 0 ? 1.12 : 1 / 1.12;
    var scaleMax = isMobileBoard() ? MOBILE_SCALE_MAX : SCALE_MAX;
    var next = Math.max(SCALE_MIN, Math.min(scaleMax, oldScale * factor));
    if (next === oldScale) return;
    var cx = size.width / 2;
    var cy = size.height / 2;
    var ratio = next / oldScale;
    position.x = cx - (cx - position.x) * ratio;
    position.y = cy - (cy - position.y) * ratio;
    BOARD_SCALE = next;
    applyTransform();
  }

  viewport.addEventListener("click", function (e) {
    var zoomBtn = closestFrom(e.target, "[data-board-zoom]");
    if (zoomBtn) {
      e.preventDefault();
      e.stopPropagation();
      zoomBoard(parseInt(zoomBtn.getAttribute("data-board-zoom"), 10) || 0);
      return;
    }
    if (closestFrom(e.target, "[data-board-reset]")) {
      e.preventDefault();
      e.stopPropagation();
      centerOnLoad();
    }
  });

  viewport.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    if (closestFrom(e.target, "a")) return;
    if (closestFrom(e.target, ".board-chrome")) return;

    var dragPiece = closestFrom(e.target, ".board-draggable");
    if (dragPiece) {
      e.preventDefault();
      setSelected(dragPiece);
      draggingSticky = dragPiece;
      stickyDragMoved = false;
      dragPiece.classList.add("sticky-note--dragging");
      stickyState.mouseX = e.clientX;
      stickyState.mouseY = e.clientY;
      stickyState.left = parsePx(dragPiece, "left");
      stickyState.top = parsePx(dragPiece, "top");
      viewport.classList.add("is-dragging");
      return;
    }

    var openPins = canvas.querySelectorAll(".board-comment-pin.is-open");
    for (var ci = 0; ci < openPins.length; ci++) {
      openPins[ci].classList.remove("is-open");
    }

    setSelected(null);
    draggingCanvas = true;
    canvasStart.x = e.clientX - position.x;
    canvasStart.y = e.clientY - position.y;
    viewport.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", function (e) {
    if (draggingSticky) {
      var screenDx = e.clientX - stickyState.mouseX;
      var screenDy = e.clientY - stickyState.mouseY;
      if (
        screenDx * screenDx + screenDy * screenDy >
        DRAG_CLICK_THRESHOLD * DRAG_CLICK_THRESHOLD
      ) {
        stickyDragMoved = true;
      }
      var dx = screenDx / BOARD_SCALE;
      var dy = screenDy / BOARD_SCALE;
      draggingSticky.style.left = stickyState.left + dx + "px";
      draggingSticky.style.top = stickyState.top + dy + "px";
      return;
    }
    if (!draggingCanvas) return;
    position.x = e.clientX - canvasStart.x;
    position.y = e.clientY - canvasStart.y;
    applyTransform();
  });

  function navigateHref(href) {
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = href;
  }

  function endDrag() {
    if (draggingSticky) {
      var href = draggingSticky.getAttribute("data-href");
      if (href && !stickyDragMoved) {
        navigateHref(href);
      }
      if (
        draggingSticky.classList.contains("board-comment-pin") &&
        !stickyDragMoved
      ) {
        var wasOpen = draggingSticky.classList.contains("is-open");
        var openPins = canvas.querySelectorAll(".board-comment-pin.is-open");
        for (var oi = 0; oi < openPins.length; oi++) {
          openPins[oi].classList.remove("is-open");
        }
        if (!wasOpen) draggingSticky.classList.add("is-open");
      }
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
      if (closestFrom(e.target, ".board-chrome")) return;
      var t = e.touches[0];
      var dragPiece = closestFrom(e.target, ".board-draggable");

      if (dragPiece) {
        e.preventDefault();
        setSelected(dragPiece);
        draggingSticky = dragPiece;
        stickyDragMoved = false;
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
        var touchDx = t.clientX - stickyState.mouseX;
        var touchDy = t.clientY - stickyState.mouseY;
        if (
          touchDx * touchDx + touchDy * touchDy >
          DRAG_CLICK_THRESHOLD * DRAG_CLICK_THRESHOLD
        ) {
          stickyDragMoved = true;
        }
        var dx = touchDx / BOARD_SCALE;
        var dy = touchDy / BOARD_SCALE;
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

  function getMobileFocusPoint() {
    var headline = canvas.querySelector(".board-media--headline");
    if (!headline) return { x: MOBILE_CX, y: MOBILE_CY };
    var left = parsePx(headline, "left");
    var top = parsePx(headline, "top");
    var computedLeft = getComputedStyle(headline).left;
    if (computedLeft && computedLeft !== "auto") {
      left = parseFloat(computedLeft) || left;
    }
    var width = headline.offsetWidth || 440;
    var height = headline.offsetHeight || 200;
    return {
      x: left + width / 2,
      y: top + height / 2
    };
  }

  function centerOnLoad() {
    var size = viewportSize();
    if (!size) {
      requestAnimationFrame(centerOnLoad);
      return;
    }

    BOARD_SCALE = computeBoardScale(size.width, size.height);
    var cx = CX;
    var cy = CY;
    if (isMobileBoard()) {
      var focus = getMobileFocusPoint();
      cx = focus.x;
      cy = focus.y;
    }
    position.x = size.width / 2 - BOARD_SCALE * cx;
    position.y = size.height / 2 - BOARD_SCALE * cy;
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

  var linkedPieces = canvas.querySelectorAll("[data-href][tabindex]");
  for (var li = 0; li < linkedPieces.length; li++) {
    linkedPieces[li].addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      navigateHref(e.currentTarget.getAttribute("data-href"));
    });
  }

  window.portfolioRecenterBoard = scheduleCenter;
})();
