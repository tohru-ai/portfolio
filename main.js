// GA4 クリック計測: gtag は index.html の <head> で定義済み
(function analytics() {
  if (typeof window.gtag !== "function") return;
  const gtag = window.gtag;

  // クリック計測: note への外部リンク（コンバージョン相当）と内部CTAボタン
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.href.includes("note.com")) {
      gtag("event", "note_outbound", {
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

// スクロール連動アニメーション: 要素が見えたらふわっと出す
(function scrollReveal() {
  const targets = document.querySelectorAll(
    ".card, .reason, .work-card, .stat, .flow-step, .faq-item, .section-title, .section-lead, .profile-body, .contact-lead, .works-more"
  );
  if (!targets.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach((el, i) => {
    el.classList.add("reveal");
    // 兄弟要素同士は少しずつ遅らせて時間差で出す
    const siblings = el.parentElement ? [...el.parentElement.children] : [];
    const idx = Math.max(0, siblings.indexOf(el));
    el.style.transitionDelay = `${Math.min(idx * 0.12, 0.48)}s`;
    observer.observe(el);
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
