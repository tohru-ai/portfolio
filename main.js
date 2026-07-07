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

// ジェネラティブ演出: 風(ヒーロー)と墨(Contact)の流れ場。外部ライブラリなし・自前value noise
(function generativeCanvas() {
  if (!("requestAnimationFrame" in window)) return;

  // value noise (格子点ハッシュ + smoothstep補間、2オクターブ)
  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var a = hash(xi, yi), b = hash(xi + 1, yi);
    var c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    var u = smooth(xf), v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    return (noise2(x, y) + 0.5 * noise2(x * 2.13, y * 2.13 + 17.7)) / 1.5;
  }

  var isMobile = window.matchMedia("(max-width: 768px)").matches;

  function createFlowField(canvas, cfg) {
    var host = canvas.parentElement;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var w = 0, h = 0, dpr = 1;
    var particles = [];
    var t = 0;
    var rafId = null;
    var inView = true;
    var pointer = { x: -9999, y: -9999, active: false };

    function resize() {
      w = host.clientWidth;
      h = host.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(Math.round((w * h) / cfg.areaPerParticle), cfg.maxCount);
      particles = [];
      for (var i = 0; i < count; i++) particles.push(spawn());
    }

    function spawn() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        px: 0, py: 0,
        v: cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin),
        lw: 0.7 + Math.random() * 0.6,
        life: 0,
        maxLife: 300 + Math.random() * 200,
        fresh: true
      };
    }

    function step() {
      t += cfg.drift;
      // 残像減衰: 透明化で古い線をゆっくり消す
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + cfg.fade + ")";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var angle = fbm(p.x * cfg.scale + t, p.y * cfg.scale) * Math.PI * 4;

        if (cfg.pointer && pointer.active) {
          var dx = p.x - pointer.x, dy = p.y - pointer.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120 && d > 0.001) {
            var away = Math.atan2(dy, dx);
            var wgt = (1 - d / 120) * 0.6;
            angle = angle * (1 - wgt) + away * wgt;
          }
        }

        p.px = p.x; p.py = p.y;
        p.x += Math.cos(angle) * p.v;
        p.y += Math.sin(angle) * p.v;
        p.life++;

        if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10 || p.life > p.maxLife) {
          particles[i] = spawn();
          continue;
        }
        if (p.fresh) { p.fresh = false; continue; }

        if (cfg.mode === "blot") {
          var r = 0.5 + 2 * noise2(p.x * 0.05, p.y * 0.05 + t * 50);
          ctx.fillStyle = cfg.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = p.lw;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    }

    function loop() {
      step();
      rafId = requestAnimationFrame(loop);
    }

    function updateRunning() {
      var shouldRun = inView && !document.hidden;
      if (shouldRun && rafId === null) {
        rafId = requestAnimationFrame(loop);
      } else if (!shouldRun && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    resize();

    if (MOTION_OFF) {
      // 静的表示: 同じ場を120ステップだけ同期実行して1枚の風紋を残す
      for (var s = 0; s < 120; s++) step();
      return;
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    if (cfg.pointer) {
      window.addEventListener("pointermove", function (e) {
        var rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
        pointer.active = pointer.y > -60 && pointer.y < rect.height + 60;
      }, { passive: true });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        updateRunning();
      }, { threshold: 0 }).observe(host);
    }
    document.addEventListener("visibilitychange", updateRunning);

    updateRunning();
  }

  function init() {
    var hero = document.querySelector(".hero .wind-canvas");
    var ink = document.querySelector(".contact .wind-canvas--ink");
    if (hero) {
      createFlowField(hero, {
        mode: "line",
        color: "rgba(30,58,95,0.12)",
        areaPerParticle: 12000,
        maxCount: isMobile ? 60 : 150,
        speedMin: 0.4, speedMax: 0.9,
        fade: 0.055,
        scale: 0.0028,
        drift: 0.0016,
        pointer: true
      });
    }
    if (ink) {
      createFlowField(ink, {
        mode: "blot",
        color: "rgba(28,30,28,0.06)",
        areaPerParticle: 22000,
        maxCount: isMobile ? 40 : 70,
        speedMin: 0.15, speedMax: 0.3,
        fade: 0.02,
        scale: 0.0035,
        drift: 0.0008,
        pointer: false
      });
    }
  }

  // LCP(ヒーローのテキスト描画)と競合しないよう、ロード後のアイドル時に起動
  function scheduleInit() {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(init, { timeout: 2000 });
    } else {
      setTimeout(init, 200);
    }
  }
  if (document.readyState === "complete") {
    scheduleInit();
  } else {
    window.addEventListener("load", scheduleInit);
  }
})();

// お問い合わせフォーム: Formspreeへfetch送信 → thanks.html へ
(function contactForm() {
  var form = document.getElementById("contact-form");
  if (!form) return;

  // エンドポイント差し替え忘れガード: プレースホルダのままならフォームを隠しnote導線のみ残す
  if (form.action.indexOf("FORM_ID") !== -1) {
    form.style.display = "none";
    return;
  }

  form.setAttribute("novalidate", "novalidate");

  var loadedAt = performance.now();
  var btn = form.querySelector('button[type="submit"]');
  var alertBox = document.getElementById("form-alert");
  var FALLBACK_MSG = "送信できませんでした。時間をおいて再度お試しいただくか、noteのDMからご連絡ください。";

  var fields = {
    name: { el: form.querySelector("#cf-name"), err: document.getElementById("err-name") },
    email: { el: form.querySelector("#cf-email"), err: document.getElementById("err-email") },
    message: { el: form.querySelector("#cf-message"), err: document.getElementById("err-message") }
  };

  function validate(key) {
    var f = fields[key];
    var v = f.el.value.trim();
    var msg = "";
    if (!v) {
      msg = { name: "お名前を入力してください", email: "メールアドレスを入力してください", message: "ご相談内容を入力してください" }[key];
    } else if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      msg = "メールアドレスの形式が正しくありません";
    }
    f.err.textContent = msg;
    if (msg) {
      f.el.setAttribute("aria-invalid", "true");
      f.el.setAttribute("aria-describedby", f.err.id);
    } else {
      f.el.removeAttribute("aria-invalid");
      f.el.removeAttribute("aria-describedby");
    }
    return !msg;
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].el.addEventListener("blur", function () { validate(key); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    alertBox.textContent = "";

    // ハニーポット / タイムトラップ(表示後3秒未満の送信はbot扱い)
    var gotcha = form.querySelector('input[name="_gotcha"]');
    if (gotcha && gotcha.value) return;
    if (performance.now() - loadedAt < 3000) {
      alertBox.textContent = "送信できませんでした。もう一度お試しください。";
      return;
    }

    var ok = true;
    Object.keys(fields).forEach(function (key) {
      if (!validate(key)) ok = false;
    });
    if (!ok) {
      var firstErr = form.querySelector('[aria-invalid="true"]');
      if (firstErr) firstErr.focus();
      return;
    }

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "送信中…";

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (res) {
      if (res.ok) {
        try { sessionStorage.setItem("lead_ok", "1"); } catch (err) {}
        location.href = "thanks.html";
      } else {
        throw new Error("send failed: " + res.status);
      }
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = original;
      alertBox.textContent = FALLBACK_MSG;
    });
  });
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
