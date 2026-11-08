/* Local content overrides.
   Edits made in /admin are stored in this browser (localStorage) and applied
   here on every page load, so no server, database or API key is needed. */
(function () {
  "use strict";
  var KEY = "site_local_content_v1";

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function textNodes(el) {
    var out = [];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) out.push(n);
    }
    return out;
  }

  function applyTexts(texts) {
    if (!texts) return;
    document.querySelectorAll("[data-ck]").forEach(function (el) {
      var keys = (el.getAttribute("data-ck") || "").split("|").filter(Boolean);
      var nodes = textNodes(el);
      keys.forEach(function (key, i) {
        var node = nodes[i];
        if (!node) return;
        if (typeof texts[key] !== "string") return;
        var raw = node.nodeValue || "";
        node.nodeValue = raw.match(/^\s*/)[0] + texts[key] + raw.match(/\s*$/)[0];
      });
    });
    document.querySelectorAll("[data-ck-attr]").forEach(function (el) {
      (el.getAttribute("data-ck-attr") || "")
        .split(";")
        .filter(Boolean)
        .forEach(function (pair) {
          var at = pair.indexOf(":");
          if (at < 0) return;
          var attr = pair.slice(0, at);
          var key = pair.slice(at + 1);
          if (typeof texts[key] === "string") el.setAttribute(attr, texts[key]);
        });
    });
    var titleEl = document.querySelector("title");
    if (titleEl) document.title = titleEl.textContent || document.title;
  }

  function applyImages(images) {
    if (!images) return;
    document.querySelectorAll("[data-ik]").forEach(function (el) {
      var url = images[el.getAttribute("data-ik")];
      if (url) el.setAttribute("src", url);
    });
    document.querySelectorAll("[data-ik-attr]").forEach(function (el) {
      (el.getAttribute("data-ik-attr") || "")
        .split(";")
        .filter(Boolean)
        .forEach(function (pair) {
          var at = pair.indexOf(":");
          if (at < 0) return;
          var url = images[pair.slice(at + 1)];
          if (url) el.setAttribute(pair.slice(0, at), url);
        });
    });
    document.querySelectorAll("[data-ik-bg]").forEach(function (el) {
      var slots = (el.getAttribute("data-ik-bg") || "").split("|");
      var i = -1;
      el.setAttribute(
        "style",
        (el.getAttribute("style") || "").replace(
          /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
          function (full, quote) {
            i++;
            var url = images[slots[i]];
            return url ? "url(" + quote + url + quote + ")" : full;
          },
        ),
      );
    });
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (err) {
      return null;
    }
  }

  /* Contact details saved from the admin "Contact Info" tab. */
  function applyContact() {
    var c = readJson("site_admin_contact_v1");
    if (!c) return;
    var digits = function (v) { return String(v || "").replace(/[^0-9]/g, ""); };
    if (c.phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.setAttribute("href", "tel:+" + digits(c.phone));
      });
    }
    if (c.whatsapp) {
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
        var rest = (a.getAttribute("href") || "").split("wa.me/")[1] || "";
        var q = rest.indexOf("?") >= 0 ? rest.slice(rest.indexOf("?")) : "";
        a.setAttribute("href", "https://wa.me/" + digits(c.whatsapp) + q);
      });
    }
    if (c.instagram) {
      document.querySelectorAll('a[href*="instagram.com"]:not([data-instagram-reel-link])').forEach(function (a) {
        a.setAttribute("href", c.instagram);
      });
    }
    if (c.facebook) {
      document.querySelectorAll("a .fa-facebook-f").forEach(function (i) {
        i.closest("a").setAttribute("href", c.facebook);
      });
    }
  }

  /* Keep a copy of appointment requests for the admin inbox (this browser). */
  function onRequestClick(e) {
    var btn = e.target && e.target.closest && e.target.closest("#appo13 .appo8, #appo13 button[type=submit]");
    if (!btn) return;
    var val = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
    var name = val("appo14");
    var phone = val("appo15");
    if (!name || !phone) return;
    var list = readJson("site_admin_requests_v1") || [];
    var now = Date.now();
    if (list[0] && list[0].phone === phone && now - list[0].createdAt < 5000) return;
    list.unshift({
      id: String(now),
      name: name,
      phone: phone,
      date: val("appo16"),
      message: val("appo17"),
      page: location.pathname,
      createdAt: now,
      read: false,
    });
    try { localStorage.setItem("site_admin_requests_v1", JSON.stringify(list.slice(0, 500))); } catch (err) {}
  }
  document.addEventListener("click", onRequestClick, true);

  function apply() {
    applyContact();
    var data = read();
    if (!data) return;
    var lang = window.__SITE_LANG__ || "ru";
    applyTexts((data.langs && data.langs[lang]) || null);
    applyImages(data.images || null);
  }

  window.__applyLocalContent__ = apply;
  apply();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  }
})();
