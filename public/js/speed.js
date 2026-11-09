/* Instant page switching.
   Pages are fetched in the background and, on click, swapped in place
   (head styles + body) without a browser page load. The original markup,
   styles and page scripts are reused unchanged; page scripts are re-run on
   every swap and the listeners they added for the previous page are removed.
   Any failure falls back to a normal page load. */
(function () {
  "use strict";
  if (window.__SPEED__) return;
  window.__SPEED__ = true;
  if (/[?&]edit=1(?:&|$)/.test(location.search)) return;
  if (!window.fetch || !window.DOMParser || !history.pushState) return;

  /* ---------- 1. Track listeners added by page scripts ---------- */
  var tracked = [];
  var nativeAdd = EventTarget.prototype.addEventListener;
  var persistMode = 0;

  function isLibScript() {
    var s = document.currentScript;
    return !!(s && s.src && /\/lib\//.test(s.src));
  }

  function patch(target) {
    target.addEventListener = function (type, fn, opts) {
      if (!persistMode && !isLibScript()) tracked.push([this, type, fn, opts]);
      return nativeAdd.call(this, type, fn, opts);
    };
  }
  patch(window);
  patch(document);

  function persistent(fn) {
    persistMode++;
    try { fn(); } finally { persistMode--; }
  }

  function cleanupPage() {
    var $ = window.jQuery;
    if ($) {
      try { $(".owl-carousel").trigger("destroy.owl.carousel"); } catch (e) {}
      try { $("html, body").stop(true); } catch (e) {}
      try { $(window).off(); $(document).off(); } catch (e) {}
    }
    try { if (window.Waypoint && window.Waypoint.destroyAll) window.Waypoint.destroyAll(); } catch (e) {}
    var list = tracked;
    tracked = [];
    for (var i = 0; i < list.length; i++) {
      try { list[i][0].removeEventListener(list[i][1], list[i][2], list[i][3]); } catch (e) {}
    }
  }

  /* ---------- 2. Page cache ---------- */
  var cache = Object.create(null);

  function withLang(url) {
    var lang = window.__SITE_LANG__ || "ru";
    url.searchParams.set("lang", lang);
    return url;
  }

  function pageUrl(href) {
    if (!href) return null;
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return null;
      if (/^\/admin/.test(url.pathname)) return null;
      if (!(url.pathname === "/" || /\.html$/.test(url.pathname))) return null;
      return url;
    } catch (e) {
      return null;
    }
  }

  function key(url) {
    var u = new URL(url.href);
    u.hash = "";
    return u.href;
  }

  function load(url) {
    var k = key(url);
    if (!cache[k]) {
      cache[k] = fetch(k, { credentials: "same-origin" }).then(function (r) {
        if (!r.ok || !/text\/html/.test(r.headers.get("content-type") || "")) throw new Error("bad");
        return r.text();
      });
      cache[k].catch(function () { delete cache[k]; });
    }
    return cache[k];
  }

  var warmedImages = Object.create(null);
  function warmImages(url) {
    var k = key(url);
    if (warmedImages[k]) return;
    warmedImages[k] = true;
    load(url).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var imgs = doc.querySelectorAll("img[src]:not([loading=lazy])");
      for (var i = 0; i < imgs.length && i < 12; i++) {
        var img = new Image();
        img.decoding = "async";
        img.src = new URL(imgs[i].getAttribute("src"), k).href;
      }
    }).catch(function () {});
  }

  /* ---------- 3. Swapping ---------- */
  var loadedScripts = Object.create(null);
  function rememberScripts() {
    var s = document.querySelectorAll("script[src]");
    for (var i = 0; i < s.length; i++) loadedScripts[s[i].src] = true;
  }

  function isSpeedScript(src) { return /\/js\/speed\.js(?:\?|$)/.test(src); }

  function sheetHref(el) {
    return el.tagName === "LINK" && /stylesheet/i.test(el.rel) ? el.href : null;
  }

  function buildHead(newHead) {
    var existing = Object.create(null);
    var oldKids = Array.prototype.slice.call(document.head.children);
    oldKids.forEach(function (el) {
      var h = sheetHref(el);
      if (h) existing[h] = el;
    });
    var nodes = [];
    var pending = [];
    var scripts = [];
    Array.prototype.forEach.call(newHead.children, function (el) {
      if (el.tagName === "SCRIPT") { scripts.push(el); return; }
      var h = sheetHref(el);
      if (h && existing[h]) { nodes.push(existing[h]); delete existing[h]; return; }
      var node = document.importNode(el, true);
      if (h) {
        pending.push(new Promise(function (res) {
          node.addEventListener("load", res);
          node.addEventListener("error", res);
          setTimeout(res, 1500);
        }));
      }
      nodes.push(node);
    });
    return { nodes: nodes, pending: pending, scripts: scripts, old: oldKids };
  }

  // Insert nodes in order WITHOUT moving any node already in <head>: moving a
  // <link rel=stylesheet> makes the browser drop and reload it, which briefly
  // unstyles the page.
  function placeNodes(nodes, onlySheets) {
    var cursor = null;
    nodes.forEach(function (n) {
      if (n.isConnected) { cursor = n; return; }
      if (onlySheets && !sheetHref(n)) return;
      var ref = cursor ? cursor.nextSibling : document.head.firstChild;
      document.head.insertBefore(n, ref);
      cursor = n;
    });
  }

  function applyHead(plan) {
    plan.old.forEach(function (el) {
      if (el.hasAttribute("data-speed") || (el.tagName === "SCRIPT" && isSpeedScript(el.src || ""))) return;
      if (plan.nodes.indexOf(el) === -1) el.remove();
    });
    placeNodes(plan.nodes, false);
  }

  function hoistFunctions(code) {
    var names = [];
    var re = /(?:^|[\s;}])function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    var m;
    while ((m = re.exec(code))) names.push(m[1]);
    return names.map(function (n) {
      return "try{window." + n + "=" + n + "}catch(e){}";
    }).join(";");
  }

  function runScript(old) {
    return new Promise(function (resolve) {
      var src = old.getAttribute("src");
      var type = old.getAttribute("type");
      if (type && !/javascript|module/i.test(type)) return resolve();
      var s = document.createElement("script");
      if (src) {
        var abs = new URL(src, location.href).href;
        if (isSpeedScript(abs)) return resolve();
        if (/\/lib\//.test(abs) && loadedScripts[abs]) return resolve();
        loadedScripts[abs] = true;
        s.src = abs;
        s.async = false;
        s.onload = s.onerror = function () { s.remove(); resolve(); };
        document.body.appendChild(s);
      } else {
        var code = old.textContent || "";
        s.textContent = "(function(){" + code + "\n;" + hoistFunctions(code) + "})();";
        document.body.appendChild(s);
        s.remove();
        resolve();
      }
    });
  }

  function runSequential(list) {
    return list.reduce(function (p, el) {
      return p.then(function () { return runScript(el); });
    }, Promise.resolve());
  }

  // A swapped-in page must appear complete at once: jump every one-off
  // entrance animation (fade/slide/reveal) to its end state so nothing pops
  // in after the swap. Looping decorations keep running.
  function finishEntrances() {
    if (!document.getAnimations) return;
    // Sections skipped by content-visibility have no animations yet; render
    // them for this one check so their entrances are finished too.
    var root = document.documentElement;
    root.classList.add("speed-finishing");
    var list = document.getAnimations();
    root.classList.remove("speed-finishing");
    list.forEach(function (a) {
      try {
        var t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
        if (!t || !isFinite(t.endTime)) return;
        a.finish();
      } catch (e) {}
    });
  }

  var busy = 0;

  function swap(url, push) {
    var token = ++busy;
    rememberScripts();
    return load(url).then(function (html) {
      if (token !== busy) return;
      var doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc.body || !doc.head) throw new Error("bad doc");

      if (push) {
        history.replaceState(Object.assign({}, history.state, { speedScroll: scrollY }), "");
      }

      var headPlan = buildHead(doc.head);
      var bodyScripts = Array.prototype.slice.call(doc.body.querySelectorAll("script"));
      bodyScripts.forEach(function (s) { s.parentNode.removeChild(s); });
      var newBody = document.importNode(doc.body, true);

      function update() {
        cleanupPage();
        applyHead(headPlan);
        document.title = doc.title || document.title;
        document.documentElement.lang = doc.documentElement.lang || document.documentElement.lang;
        var dir = doc.documentElement.getAttribute("dir");
        if (dir) document.documentElement.setAttribute("dir", dir);
        else document.documentElement.removeAttribute("dir");
        document.documentElement.classList.add("speed-swapped");
        document.documentElement.replaceChild(newBody, document.body);
        if (push) history.pushState({ speed: true }, "", url.href);
        if (url.hash && document.getElementById(url.hash.slice(1))) {
          document.getElementById(url.hash.slice(1)).scrollIntoView();
        } else if (push) {
          scrollTo(0, 0);
        } else if (history.state && typeof history.state.speedScroll === "number") {
          scrollTo(0, history.state.speedScroll);
        } else {
          scrollTo(0, 0);
        }
        finishEntrances();
        return Promise.all(headPlan.pending);
      }

      function afterSwap() {
        return runSequential(headPlan.scripts.concat(bodyScripts)).then(function () {
          try { document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true })); } catch (e) {}
          try { window.dispatchEvent(new Event("load")); } catch (e) {}
          warmLinks();
        });
      }

      // Load new stylesheets (and Hebrew fonts) BEFORE swapping, so the new
      // page never paints unstyled for a moment.
      function preload() {
        placeNodes(headPlan.nodes, true);
        var waits = headPlan.pending.slice();
        if (document.fonts && document.fonts.load && /lang="he"/.test(html.slice(0, 400))) {
          waits.push(Promise.all([
            document.fonts.load('400 16px "Heebo"', "\u05d0"),
            document.fonts.load('700 16px "Heebo"', "\u05d0"),
            document.fonts.load('700 32px "Frank Ruhl Libre"', "\u05d0")
          ]).catch(function () {}));
        }
        return Promise.race([
          Promise.all(waits),
          new Promise(function (r) { setTimeout(r, 1500); })
        ]);
      }

      return preload().then(function () {
      if (token !== busy) return;
      if (document.startViewTransition) {
        var t = document.startViewTransition(update);
        return t.updateCallbackDone.then(afterSwap);
      }
      return update().then(afterSwap);
      });
    }).catch(function () {
      if (token === busy) location.href = url.href;
    });
  }

  window.__siteGo = function (href, language) {
    var url = pageUrl(href);
    if (!url || window.__SITE_EDIT__) { location.href = href; return; }
    if (language) url.searchParams.set("lang", language);
    else withLang(url);
    swap(url, true);
  };

  /* ---------- 4. Events (persistent across swaps) ---------- */
  function linkFrom(event) {
    var t = event.target;
    return t && t.closest ? t.closest("a[href]") : null;
  }

  persistent(function () {
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.__SITE_EDIT__) return;
      var a = linkFrom(event);
      if (!a || a.closest(".lang-dropdown")) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      var raw = a.getAttribute("href") || "";
      if (!raw || raw[0] === "#" || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      var url = pageUrl(a.href);
      if (!url) return;
      if (!/[?&]lang=/.test(raw)) withLang(url);
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      event.preventDefault();
      swap(url, true);
    });

    window.addEventListener("popstate", function () {
      var url = pageUrl(location.href);
      if (url) swap(url, false);
      else location.reload();
    });

    function intent(event) {
      var a = linkFrom(event);
      if (!a) return;
      var url = pageUrl(a.href);
      if (!url) return;
      if (!a.closest(".lang-dropdown")) withLang(url);
      load(url);
      warmImages(url);
    }
    document.addEventListener("pointerover", intent, { passive: true });
    document.addEventListener("touchstart", intent, { passive: true });
  });

  function warmLinks() {
    var go = function () {
      var links = document.querySelectorAll("a.nav-link[href], .navbar-nav a[href], .navbar-actions a[href]");
      for (var i = 0; i < links.length; i++) {
        var url = pageUrl(links[i].href);
        if (url) load(withLang(url));
      }
      var here = pageUrl(location.href);
      if (here) load(here);
      document.querySelectorAll(".lang-menu a[href]").forEach(function (link) {
        var alternate = pageUrl(link.href);
        if (alternate) load(alternate);
      });
    };
    if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1200 });
    else setTimeout(go, 400);
  }

  var vt = document.createElement("style");
  vt.setAttribute("data-speed", "");
  vt.textContent =
    "::view-transition-old(root),::view-transition-new(root){animation-duration:.14s}" +
    // Scroll-reveal boxes would be hidden by the reveal script and pop in late.
    "html.speed-swapped body .wow.wow{visibility:visible!important;animation:none!important}" +
    "html.speed-finishing body *{content-visibility:visible!important}";
  document.head.appendChild(vt);

  persistent(function () {
    window.addEventListener("load", function () {
      rememberScripts();
      warmLinks();
    }, { once: true });
  });
  if (document.readyState === "complete") { rememberScripts(); warmLinks(); }
})();
