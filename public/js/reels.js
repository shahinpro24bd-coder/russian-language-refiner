/* Fast, clean video journal.
   Only optimized posters ship initially. A direct native video is created
   after Play, so no Instagram page, caption or interface enters the card. */
(function () {
  "use strict";

  function initReels() {
    var root = document.querySelector("[data-reels]");
    if (!root || root.getAttribute("data-reels-ready") === "true") return;
    root.setAttribute("data-reels-ready", "true");

    var track = root.querySelector("[data-reels-track]");
    var previous = root.querySelector("[data-reels-prev]");
    var next = root.querySelector("[data-reels-next]");
    var progress = root.querySelector("[data-reels-progress]");
    if (!track) return;

    function updateControls() {
      var max = Math.max(0, track.scrollWidth - track.clientWidth);
      var position = Math.max(0, Math.min(max, track.scrollLeft));
      if (previous) previous.disabled = position <= 3;
      if (next) next.disabled = position >= max - 3;
      if (progress) {
        var visible = max > 0 ? (position + track.clientWidth) / track.scrollWidth : 1;
        progress.style.transform = "scaleX(" + Math.max(0.05, Math.min(1, visible)) + ")";
      }
    }

    function pageStep() {
      var card = track.querySelector(".reel-card");
      if (!card) return track.clientWidth;
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function move(direction) {
      track.scrollBy({ left: direction * pageStep(), behavior: "smooth" });
    }

    function resetMedia(media) {
      if (!media || media === currentMedia) return;
      var player = media.querySelector("video[data-reel-player]");
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
        player.remove();
      }
      media.classList.remove("is-loading", "is-loaded", "is-unavailable");
      media.removeAttribute("aria-busy");
    }

    var currentMedia = null;

    function playReel(media, button) {
      if (!media || media.classList.contains("is-loading") || media.classList.contains("is-loaded")) return;

      if (currentMedia && currentMedia !== media) {
        var oldMedia = currentMedia;
        currentMedia = null;
        resetMedia(oldMedia);
      }
      currentMedia = media;

      var source = button.getAttribute("data-reel-src");

      /* Instagram blocks website playback for these two posts. Their existing
         polished external fallback remains until their MP4 files are supplied. */
      if (!source) {
        media.classList.add("is-unavailable");
        return;
      }

      media.classList.add("is-loading");
      media.setAttribute("aria-busy", "true");

      var reel = button.getAttribute("data-reel-play");
      var player = document.createElement("video");
      player.className = "reel-player";
      player.setAttribute("data-reel-player", reel);
      player.setAttribute("aria-label", button.getAttribute("aria-label") || "Video");
      player.src = source;
      player.preload = "auto";
      player.autoplay = true;
      player.controls = true;
      player.playsInline = true;
      player.setAttribute("playsinline", "");
      player.setAttribute("webkit-playsinline", "");

      function showPlayer() {
        if (!player.isConnected) return;
        media.classList.remove("is-loading");
        media.classList.add("is-loaded");
        media.removeAttribute("aria-busy");
      }

      player.addEventListener("playing", showPlayer);
      player.addEventListener("error", function () {
        if (!player.isConnected) return;
        player.remove();
        media.classList.remove("is-loading", "is-loaded");
        media.removeAttribute("aria-busy");
        if (currentMedia === media) currentMedia = null;
      });

      media.appendChild(player);
      var playRequest = player.play();
      if (playRequest && typeof playRequest.catch === "function") {
        playRequest.catch(function () {
          /* Native controls remain available if a browser blocks autoplay. */
          showPlayer();
        });
      }
    }

    root.addEventListener("click", function (event) {
      var playButton = event.target.closest && event.target.closest("[data-reel-play]");
      if (playButton && root.contains(playButton)) {
        playReel(playButton.closest(".reel-media"), playButton);
        return;
      }
      var control = event.target.closest && event.target.closest("[data-reels-prev], [data-reels-next]");
      if (control && !control.disabled) move(control.hasAttribute("data-reels-prev") ? -1 : 1);
    });

    track.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    });

    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        updateControls();
      });
    }, { passive: true });
    window.addEventListener("resize", updateControls, { passive: true });
    updateControls();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initReels);
  else initReels();
  document.addEventListener("DOMContentLoaded", initReels);
})();
