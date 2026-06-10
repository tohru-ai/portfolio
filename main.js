// 実績カードの描画
(function renderWorks() {
  const grid = document.getElementById("works-grid");
  if (!grid || typeof articles === "undefined") return;

  articles.forEach((article) => {
    const card = document.createElement("a");
    card.className = "work-card";
    card.href = article.url;
    card.target = "_blank";
    card.rel = "noopener";

    const tag = document.createElement("span");
    tag.className = "work-tag";
    tag.textContent = article.tag;

    const title = document.createElement("h3");
    title.className = "work-title";
    title.textContent = article.title;

    const desc = document.createElement("p");
    desc.className = "work-desc";
    desc.textContent = article.description;

    card.append(tag, title, desc);
    grid.appendChild(card);
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
