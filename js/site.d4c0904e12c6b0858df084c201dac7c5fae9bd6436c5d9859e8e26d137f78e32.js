// Единственный скрипт сайта. Без него всё читается: карточки раскрыты, термины — ссылки на свои страницы.
// Здесь: раскрытие терминов на месте и подгрузка ленты.
(function () {
  "use strict";

  var counter = 0;

  // --- Термины ---
  function closeTerm(term) {
    var btn = term.querySelector(".term-btn");
    var def = term.querySelector(".term-def");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (def) def.hidden = true;
  }

  function initTerm(term) {
    var link = term.querySelector(".term-link");
    var def = term.querySelector(".term-def");
    if (!link || !def) return;
    counter += 1;
    def.id = "term-def-" + counter;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "term-btn";
    btn.textContent = link.textContent;
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", def.id);
    link.replaceWith(btn);

    btn.addEventListener("click", function () {
      var expand = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", expand ? "true" : "false");
      def.hidden = !expand;
    });
    term.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
        closeTerm(term);
        btn.focus();
      }
    });
  }

  // В ленте термин — просто текст: разворачиваем span обратно в слово, без ссылки и хинта
  function plainifyTerm(term) {
    var trigger = term.querySelector(".term-link, .term-btn");
    term.replaceWith(document.createTextNode(trigger ? trigger.textContent : term.textContent));
  }

  function initWithin(root) {
    Array.prototype.forEach.call(root.querySelectorAll(".term[data-term]"), function (term) {
      if (term.closest(".feed")) plainifyTerm(term);
      else initTerm(term);
    });
  }

  // --- Лента: более ранние дни подгружаются при прокрутке из готовых страниц дней ---
  function initFeed() {
    var feed = document.querySelector("[data-feed]");
    var more = document.querySelector("[data-feed-more]");
    if (!feed || !more || !("IntersectionObserver" in window) || !window.fetch || !window.DOMParser) return;
    var link = more.querySelector("a");
    var loading = false;

    function relevel(node, tag) {
      var fresh = document.createElement(tag);
      fresh.className = node.className;
      while (node.firstChild) fresh.appendChild(node.firstChild);
      node.parentNode.replaceChild(fresh, node);
    }

    function loadOlder() {
      if (loading || !link) return;
      loading = true;
      var pageUrl = new URL(link.getAttribute("href"), location.href);
      fetch(pageUrl.href).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      }).then(function (html) {
        var day = new DOMParser().parseFromString(html, "text/html").querySelector(".feed-day");
        if (!day) throw new Error("no feed-day");
        day = document.importNode(day, true);
        // ссылки на странице дня относительные: пересчитываем их от её адреса
        Array.prototype.forEach.call(day.querySelectorAll("[href]"), function (a) {
          var url = new URL(a.getAttribute("href"), pageUrl.href);
          a.setAttribute("href", url.origin === location.origin ? url.pathname + url.search + url.hash : url.href);
        });
        Array.prototype.forEach.call(day.querySelectorAll("h2.card-title"), function (h) { relevel(h, "h3"); });
        Array.prototype.forEach.call(day.querySelectorAll(".card-more h3"), function (h) { relevel(h, "h4"); });
        var heading = document.createElement("h2");
        heading.className = "feed-date";
        var dateLink = document.createElement("a");
        dateLink.href = pageUrl.pathname;
        dateLink.textContent = link.getAttribute("data-human") || day.getAttribute("data-day");
        heading.appendChild(dateLink);
        day.insertBefore(heading, day.firstChild);
        feed.appendChild(day);
        initWithin(day);

        var older = day.getAttribute("data-older");
        if (older) {
          link.setAttribute("href", new URL(older, pageUrl.href).pathname);
          link.setAttribute("data-human", day.getAttribute("data-older-human") || "");
          link.textContent = "Раньше: " + (day.getAttribute("data-older-human") || "");
          loading = false;
        } else {
          observer.disconnect();
          more.parentNode.removeChild(more);
        }
      }).catch(function () {
        // сбой сети: остаётся обычная ссылка на предыдущий день
        observer.disconnect();
        more.classList.remove("is-auto");
      });
    }

    link.setAttribute("data-human", link.textContent.replace(/^Раньше:\s*/, ""));
    more.classList.add("is-auto");
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) loadOlder();
    }, { rootMargin: "600px 0px" });
    observer.observe(more);
  }

  function init() {
    initWithin(document);
    initFeed();
  }

  // Скрипт подключён в конце body: разметка уже разобрана
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
