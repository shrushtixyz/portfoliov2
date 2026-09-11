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
  var SCALE_MAX = 1.05;
  var ZOOM_BOOST = 1.5;
  var MOBILE_MAX = 900;
  var MOBILE_FIT_WIDTH = 720;
  var MOBILE_FIT_HEIGHT = 780;
  var MOBILE_ZOOM_BOOST = 1.86;
  var MOBILE_SCALE_MAX = 1.23;
  var MOBILE_CX = 1320;
  var MOBILE_CY = 820;
  var MOBILE_WIDGET_PULL = 0.28;
  var MOBILE_KINVEST_LEFT = 907;
  var MOBILE_STICKY_BIO_LEFT = 1304;
  var MOBILE_WIDGET_SEL =
    ".board-gallery, .board-media, .board-comment-pin, .board-hint, .board-card, .board-doodle";

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
      resetBoard();
    }
  });

  viewport.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    if (closestFrom(e.target, "a")) return;
    if (closestFrom(e.target, ".board-chrome")) return;

    var dragPiece = closestFrom(e.target, ".board-draggable");
    if (dragPiece) {
      e.preventDefault();
      beginPieceDrag(dragPiece, e.clientX, e.clientY);
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
      if (stickyDragMoved && isMobileBoard()) {
        draggingSticky.dataset.userMoved = "1";
      }
      draggingSticky.classList.remove("sticky-note--dragging");
      delete draggingSticky.dataset.dragging;
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
        beginPieceDrag(dragPiece, t.clientX, t.clientY);
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

  function updateMobileWidgetNudge() {
    var mobile = isMobileBoard();
    var focus = mobile ? getMobileFocusPoint() : null;
    var nodes = canvas.querySelectorAll(MOBILE_WIDGET_SEL);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!mobile || el.classList.contains("board-media--headline")) {
        el.style.removeProperty("--board-nudge-x");
        el.style.removeProperty("--board-nudge-y");
        continue;
      }
      if (
        el === draggingSticky ||
        el.dataset.dragging === "1" ||
        el.dataset.userMoved === "1"
      ) {
        el.style.setProperty("--board-nudge-x", "0px");
        el.style.setProperty("--board-nudge-y", "0px");
        continue;
      }
      var left = parsePx(el, "left");
      var top = parsePx(el, "top");
      var w = el.offsetWidth || 0;
      var h = el.offsetHeight || 0;
      var ecx = left + w / 2;
      var ecy = top + h / 2;
      var nx = (focus.x - ecx) * MOBILE_WIDGET_PULL;
      var ny = (focus.y - ecy) * MOBILE_WIDGET_PULL;
      el.style.setProperty("--board-nudge-x", nx + "px");
      el.style.setProperty("--board-nudge-y", ny + "px");
    }
  }

  function readInlinePx(el, prop) {
    var attr = el.getAttribute("style") || "";
    var re = new RegExp("(?:^|;)\\s*" + prop + ":\\s*([\\d.]+)px", "i");
    var m = attr.match(re);
    if (m) return m[1];
    return String(parsePx(el, prop));
  }

  function ensureBasePosition(el) {
    if (!el.dataset.baseLeft) {
      el.dataset.baseLeft = readInlinePx(el, "left");
    }
    if (!el.dataset.baseTop) {
      el.dataset.baseTop = readInlinePx(el, "top");
    }
  }

  var didSnapshotBases = false;
  function snapshotBasePositionsOnce() {
    if (didSnapshotBases) return;
    didSnapshotBases = true;
    var nodes = canvas.querySelectorAll(
      MOBILE_WIDGET_SEL + ", .board-media--headline"
    );
    for (var i = 0; i < nodes.length; i++) {
      ensureBasePosition(nodes[i]);
    }
  }

  function restoreDesktopBoardPositions() {
    // Only revert pieces we reposition on mobile — never clobber doodles/other widgets
    var sels = [
      ".board-media--kinvest-center",
      ".board-media--sticky-bio"
    ];
    for (var i = 0; i < sels.length; i++) {
      var el = canvas.querySelector(sels[i]);
      if (!el || !el.dataset.baseLeft) continue;
      el.style.left = el.dataset.baseLeft + "px";
      if (el.dataset.baseTop) el.style.top = el.dataset.baseTop + "px";
      el.style.removeProperty("--board-nudge-x");
      el.style.removeProperty("--board-nudge-y");
      delete el.dataset.userMoved;
      delete el.dataset.dragging;
    }
  }

  function restoreAllBoardPositions() {
    snapshotBasePositionsOnce();
    var nodes = canvas.querySelectorAll(
      MOBILE_WIDGET_SEL + ", .board-media--headline"
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      ensureBasePosition(el);
      if (!el.dataset.baseLeft) continue;
      el.style.left = el.dataset.baseLeft + "px";
      if (el.dataset.baseTop) el.style.top = el.dataset.baseTop + "px";
      el.style.removeProperty("--board-nudge-x");
      el.style.removeProperty("--board-nudge-y");
      delete el.dataset.userMoved;
      delete el.dataset.dragging;
      el.classList.remove("sticky-note--dragging", "is-selected", "is-open");
    }
    setSelected(null);
  }

  function resetBoard() {
    draggingCanvas = false;
    draggingSticky = null;
    stickyDragMoved = false;
    viewport.classList.remove("is-dragging");
    restoreAllBoardPositions();
    centerOnLoad();
  }

  function applyMobilePieceLeft(sel, mobileLeft) {
    var el = canvas.querySelector(sel);
    if (!el) return;
    ensureBasePosition(el);
    if (!isMobileBoard()) return;
    if (el.dataset.userMoved === "1") return;
    el.style.left = mobileLeft + "px";
  }

  function applyMobileAssetPositions() {
    snapshotBasePositionsOnce();
    if (!isMobileBoard()) {
      restoreDesktopBoardPositions();
      return;
    }
    applyMobilePieceLeft(".board-media--kinvest-center", MOBILE_KINVEST_LEFT);
    applyMobilePieceLeft(".board-media--sticky-bio", MOBILE_STICKY_BIO_LEFT);
  }

  function beginPieceDrag(dragPiece, clientX, clientY) {
    setSelected(dragPiece);
    draggingSticky = dragPiece;
    stickyDragMoved = false;
    dragPiece.classList.add("sticky-note--dragging");

    var left = parsePx(dragPiece, "left");
    var top = parsePx(dragPiece, "top");

    // Nudge bake-in is mobile-only so desktop drag stays 1:1 with layout left/top
    if (isMobileBoard()) {
      dragPiece.dataset.dragging = "1";
      var nudgeX =
        parseFloat(
          String(dragPiece.style.getPropertyValue("--board-nudge-x") || "0")
        ) || 0;
      var nudgeY =
        parseFloat(
          String(dragPiece.style.getPropertyValue("--board-nudge-y") || "0")
        ) || 0;
      left += nudgeX;
      top += nudgeY;
      dragPiece.style.left = left + "px";
      dragPiece.style.top = top + "px";
      dragPiece.style.setProperty("--board-nudge-x", "0px");
      dragPiece.style.setProperty("--board-nudge-y", "0px");
    }

    stickyState.mouseX = clientX;
    stickyState.mouseY = clientY;
    stickyState.left = left;
    stickyState.top = top;
    viewport.classList.add("is-dragging");
  }

  function centerOnLoad() {
    var size = viewportSize();
    if (!size) {
      requestAnimationFrame(centerOnLoad);
      return;
    }

    BOARD_SCALE = computeBoardScale(size.width, size.height);
    var focus = getMobileFocusPoint();
    var cx = focus.x;
    var cy = focus.y;
    position.x = size.width / 2 - BOARD_SCALE * cx;
    position.y = size.height / 2 - BOARD_SCALE * cy;
    applyTransform();
    applyMobileAssetPositions();
    updateMobileWidgetNudge();
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
