export function initGlitch(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const hoverTargets = document.querySelectorAll<HTMLElement>(".glitchable");
  const revealTargets = document.querySelectorAll<HTMLElement>(".section-index");
  let last = 0;
  const fire = (target: HTMLElement) => {
    const now = performance.now();
    if (now - last < 8000) return;
    last = now;
    target.classList.add("is-glitching");
    window.setTimeout(() => target.classList.remove("is-glitching"), 120);
  };
  hoverTargets.forEach((target) => {
    target.addEventListener("mouseenter", () => fire(target));
    target.addEventListener("focus", () => fire(target));
  });
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        fire(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -24% 0px", threshold: 0.2 }
  );
  revealTargets.forEach((target) => observer.observe(target));
}
