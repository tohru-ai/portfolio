// モーションポリシー: デフォルト全員フル演出。
// reduced-motion環境の閲覧者にだけ停止ボタンを出し、明示的に止めた場合のみ静的表示。
var MOTION_OFF = false;
(function motionPolicy() {
  document.documentElement.classList.add("js");

  var stopped = false;
  try { stopped = sessionStorage.getItem("site-motion") === "off"; } catch (e) {}
  var mediaReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  MOTION_OFF = mediaReduced && stopped;

  if (!MOTION_OFF) document.documentElement.classList.add("force-motion");

  if (mediaReduced) {
    var btn = document.createElement("button");
    btn.className = "motion-toggle";
    btn.type = "button";
    btn.textContent = MOTION_OFF ? "▶ アニメーションを再生する" : "■ アニメーションを停止する";
    btn.addEventListener("click", function () {
      try { sessionStorage.setItem("site-motion", MOTION_OFF ? "on" : "off"); } catch (e) {}
      location.reload();
    });
    document.body.appendChild(btn);
  }
})();

// GA4 クリック計測: gtag は index.html の <head> で定義済み
(function analytics() {
  if (typeof window.gtag !== "function") return;
  const gtag = window.gtag;

  // note への外部リンク（コンバージョン相当）/ Fine Up AI への外部リンク / 内部CTAボタン
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.href.includes("note.com")) {
      gtag("event", "note_outbound", {
        link_text: link.textContent.trim(),
        link_url: link.href,
        transport_type: "beacon",
      });
    } else if (link.href.includes("fineupai.jp")) {
      gtag("event", "fineup_outbound", {
        link_text: link.textContent.trim(),
        link_url: link.href,
        transport_type: "beacon",
      });
    } else if (link.matches(".btn, .floating-cta")) {
      gtag("event", "cta_click", {
        link_text: link.textContent.trim(),
        transport_type: "beacon",
      });
    }
  });
})();

// ヒーロー開演: フォント読み込み完了で発火（詰まっても1.5sで必ず開く保険付き）
(function heroSequence() {
  const hero = document.querySelector(".hero");
  if (!hero || MOTION_OFF) return;

  const start = () => hero.classList.add("is-ready");
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
  }
  setTimeout(start, 1500);
})();

// statsカウントアップ（リビール到達時に1回だけ）
function countUp(el) {
  const target = parseInt(el.dataset.count, 10);
  if (isNaN(target)) return;
  const dur = 900;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// スクロール連動リビール: data-reveal 要素が見えたら出す（兄弟同士は時間差）
(function scrollReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      if (!MOTION_OFF) {
        entry.target.querySelectorAll(".stat-value[data-count]").forEach(countUp);
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  targets.forEach((el) => {
    const siblings = el.parentElement
      ? [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"))
      : [];
    const idx = Math.max(0, siblings.indexOf(el));
    el.style.transitionDelay = `${Math.min(idx * 0.1, 0.4)}s`;
    observer.observe(el);
  });
})();

// Fine Up AI 帯: 到達したら濃紺面がワイプで開く
// 注意: clip-path が掛かった要素自身を observe すると交差率が0のままになるため、
// クリップされていない親セクション(#company)を監視する
(function companyWipe() {
  const section = document.getElementById("company");
  const bg = document.querySelector(".company-bg");
  if (!section || !bg || !("IntersectionObserver" in window)) {
    if (bg) bg.classList.add("is-open");
    return;
  }

  new IntersectionObserver(([entry], obs) => {
    if (entry.isIntersecting) {
      bg.classList.add("is-open");
      obs.disconnect();
    }
  }, { threshold: 0, rootMargin: "0px 0px -18% 0px" }).observe(section);
})();

// 追従CTA: ヒーローを過ぎたら表示、Contactが見えたら隠す
(function floatingCta() {
  const cta = document.getElementById("floating-cta");
  const hero = document.querySelector(".hero");
  const contact = document.getElementById("contact");
  if (!cta || !hero || !contact) return;

  let pastHero = false;
  let onContact = false;

  const update = () => {
    cta.classList.toggle("is-visible", pastHero && !onContact);
  };

  new IntersectionObserver(([entry]) => {
    pastHero = !entry.isIntersecting;
    update();
  }).observe(hero);

  new IntersectionObserver(([entry]) => {
    onContact = entry.isIntersecting;
    update();
  }, { threshold: 0.3 }).observe(contact);
})();
