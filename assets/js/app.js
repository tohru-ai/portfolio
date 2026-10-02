/* assets/js/app.js — 全ページ共通のインタラクション（_shared.css と対の共有JS）
   開閉の主機能は外部ライブラリなしで動く。GSAP は使わない。 */
(function () {
  'use strict';
  var doc = document;

  /* ===== ヘッダー：スクロールで白地に ===== */
  var header = doc.querySelector('.c-header');
  if (header && !header.classList.contains('c-header--solid')) {
    var onScroll = function () { header.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ===== PCドロップダウン（できること）：開閉は is-open に一本化 ===== */
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  function setMega(item, open, focusBtn) {
    var b = item.querySelector('[data-mega-toggle]');
    item.classList.toggle('is-open', open);
    if (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); if (!open && focusBtn) b.focus(); }
  }
  doc.querySelectorAll('[data-mega-toggle]').forEach(function (btn) {
    var item = btn.closest('.c-nav__item');
    btn.addEventListener('click', function (e) { e.preventDefault(); setMega(item, !item.classList.contains('is-open')); });
    if (canHover) {
      item.addEventListener('mouseenter', function () { setMega(item, true); });
      item.addEventListener('mouseleave', function () { setMega(item, false); });
    }
    item.addEventListener('focusout', function (e) { if (!item.contains(e.relatedTarget)) setMega(item, false); });
  });
  doc.addEventListener('click', function (e) {
    doc.querySelectorAll('.c-nav__item.is-open').forEach(function (item) { if (!item.contains(e.target)) setMega(item, false); });
  });

  /* ===== スマホドロワー ===== */
  var drawer = doc.querySelector('[data-drawer]');
  var openers = doc.querySelectorAll('[data-drawer-open]');
  function setDrawer(open) {
    if (!drawer) return;
    var wasOpen = drawer.classList.contains('is-open');
    if (!open && !wasOpen) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    doc.body.classList.toggle('is-locked', open);
    openers.forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    if (open) { var c = drawer.querySelector('.c-drawer__close'); if (c) c.focus(); }
    else if (wasOpen && openers[0]) { openers[0].focus(); }
  }
  openers.forEach(function (b) { b.addEventListener('click', function () { setDrawer(true); }); });
  if (drawer) {
    drawer.querySelectorAll('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', function () { setDrawer(false); }); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
    drawer.querySelectorAll('.c-drawer__acc').forEach(function (b) {
      b.addEventListener('click', function () {
        var li = b.closest('li');
        var open = li.classList.toggle('is-open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setDrawer(false);
    doc.querySelectorAll('.c-nav__item.is-open').forEach(function (i) { setMega(i, false, true); });
  });

  /* ===== FAQアコーディオン（イベントデリゲート） ===== */
  doc.addEventListener('click', function (e) {
    var q = e.target.closest('.c-faq__q');
    if (!q) return;
    var item = q.closest('.c-faq__item');
    var open = item.classList.toggle('is-open');
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ===== スクロールで現れる（[data-reveal]） ===== */
  var reveals = doc.querySelectorAll('[data-reveal]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reveals.length) {
    if (!('IntersectionObserver' in window) || reduce) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
      reveals.forEach(function (el) { io.observe(el); });
      /* セーフティネット：読み込み後に画面内で隠れたままの要素を出す */
      window.addEventListener('load', function () {
        setTimeout(function () {
          reveals.forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
          });
        }, 600);
      });
    }
  }

  /* ===== お問い合わせフォーム（contact.html）：Formspree へ送信 → thanks.html へ =====
     JS が無い環境では通常の POST 送信（Formspree の完了画面）になる。 */
  var form = doc.querySelector('[data-contact-form]');
  if (form) {
    form.setAttribute('novalidate', 'novalidate');
    var loadedAt = Date.now();
    var btn = form.querySelector('button[type="submit"]');
    var alertBox = form.querySelector('[data-form-alert]');
    var MSG = { name: 'お名前を入力してください', email: 'メールアドレスを入力してください', message: 'ご相談内容を入力してください', agree: 'プライバシーポリシーへの同意が必要です' };
    var validate = function (f) {
      var v = f.type === 'checkbox' ? f.checked : f.value.trim();
      var msg = '';
      if (!v) msg = MSG[f.name] || '入力してください';
      else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim())) msg = 'メールアドレスの形式が正しくありません';
      var err = doc.getElementById('err-' + f.name);
      if (err) err.textContent = msg;
      f.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    };
    form.querySelectorAll('[required]').forEach(function (f) {
      f.addEventListener('blur', function () { validate(f); });
      /* 入力中にエラーを消す：次の欄を押した瞬間にエラー文が消えて行がずれ、クリックが外れるのを防ぐ */
      f.addEventListener(f.type === 'checkbox' ? 'change' : 'input', function () { if (f.getAttribute('aria-invalid') === 'true') validate(f); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (alertBox) alertBox.textContent = '';
      var gotcha = form.querySelector('input[name="_gotcha"]');
      if (gotcha && gotcha.value) return;
      if (Date.now() - loadedAt < 3000) { if (alertBox) alertBox.textContent = '数秒おいてから、もう一度送信してください。'; return; }
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (f) { if (!validate(f)) ok = false; });
      if (!ok) { var first = form.querySelector('[aria-invalid="true"]'); if (first) first.focus(); return; }
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('send failed: ' + res.status);
          if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form: 'contact' });
          try { sessionStorage.setItem('lead_ok', '1'); } catch (err) {}
          location.href = form.getAttribute('data-thanks') || 'thanks.html';
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (alertBox) alertBox.textContent = '送信できませんでした。時間をおいて、もう一度お試しください。';
        });
    });
  }

  /* ===== トップ内のリンク（index.html#works 等）はトップ上ならその場でスクロール ===== */
  var path = location.pathname;
  if (/\/$|\/index\.html$/.test(path)) {
    doc.querySelectorAll('a[href^="index.html#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = doc.getElementById(a.getAttribute('href').split('#')[1]);
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + t.id);
      });
    });
  }

  /* ===== 計測：主要CTAのクリック ===== */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-cta]');
    if (a && typeof window.gtag === 'function') window.gtag('event', 'cta_click', { cta: a.getAttribute('data-cta') });
  });
})();
