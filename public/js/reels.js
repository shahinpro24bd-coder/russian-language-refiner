/* Fast Instagram Reel gallery.
   Only the optimized posters ship with the page. An Instagram iframe is
   created after an explicit Play action, so the initial page stays light. */
(function () {
  "use strict";

  function warmInstagram() {
    if (document.getElementById("instagram-preconnect")) return;
    var dns = document.createElement("link");
    dns.rel = "dns-prefetch";
    dns.href = "https://www.instagram.com";
    var link = document.createElement("link");
    link.id = "instagram-preconnect";
    link.rel = "preconnect";
    link.href = "https://www.instagram.com";
    link.crossOrigin = "anonymous";
    document.head.appendChild(dns);
    document.head.appendChild(link);
  }

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
      var player = media.querySelector("iframe[data-reel-player]");
      if (player) player.remove();
      media.classList.remove("is-loading", "is-loaded", "is-unavailable");
      media.removeAttribute("aria-busy");
    }

    var currentMedia = null;

    function playReel(media, button) {
      if (!media || media.classList.contains("is-loading") || media.classList.contains("is-loaded")) return;
      warmInstagram();

      if (currentMedia && currentMedia !== media) {
        var oldMedia = currentMedia;
        currentMedia = null;
        resetMedia(oldMedia);
      }
      currentMedia = media;

      /* Instagram lets creators disable website embeds per Reel. For those
         posts, keep the gallery polished and offer the original Reel instead
         of rendering Instagram's broken-post error inside the card. */
      if (button.hasAttribute("data-reel-external")) {
        media.classList.add("is-unavailable");
        return;
      }

      media.classList.add("is-loading");
      media.setAttribute("aria-busy", "true");

      var reel = button.getAttribute("data-reel-play");
      var player = document.createElement("iframe");
      player.className = "reel-player";
      player.setAttribute("data-reel-player", reel);
      player.title = button.getAttribute("aria-label") || "Instagram Reel";
      player.src = "https://www.instagram.com/reel/" + encodeURIComponent(reel) + "/embed/?utm_source=ig_embed";
      player.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
      player.allowFullscreen = true;
      player.loading = "eager";
      player.referrerPolicy = "strict-origin-when-cross-origin";

      player.addEventListener("load", function () {
        if (!player.isConnected) return;
        media.classList.remove("is-loading");
        media.classList.add("is-loaded");
        media.removeAttribute("aria-busy");
      });
      player.addEventListener("error", function () {
        if (!player.isConnected) return;
        player.remove();
        media.classList.remove("is-loading", "is-loaded", "is-unavailable");
        media.removeAttribute("aria-busy");
        if (currentMedia === media) currentMedia = null;
      });

      media.appendChild(player);
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

    root.addEventListener("pointerover", function (event) {
      if (event.target.closest && event.target.closest("[data-reel-play]")) warmInstagram();
    }, { passive: true });
    root.addEventListener("focusin", function (event) {
      if (event.target.closest && event.target.closest("[data-reel-play]")) warmInstagram();
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
