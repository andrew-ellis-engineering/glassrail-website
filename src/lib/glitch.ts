export function initGlitch(): void {
  const targets = document.querySelectorAll<HTMLElement>(".section-index, .glitchable");
  let last = 0;
  const fire = (target: HTMLElement) => {
    const now = performance.now();
    if (now - last < 4000) return;
    last = now;
    target.classList.add("is-glitching");
    window.setTimeout(() => target.classList.remove("is-glitching"), 120);
  };
  targets.forEach((target) => {
    target.addEventListener("mouseenter", () => fire(target));
    target.addEventListener("focus", () => fire(target));
  });
}
