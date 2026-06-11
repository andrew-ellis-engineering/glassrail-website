export function initNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  if (!nav) return;
  const update = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 80);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}
