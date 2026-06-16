export function initTerminalReplay(): void {
  const terminal = document.querySelector<HTMLElement>("[data-terminal-code]");
  const code = terminal?.querySelector("code");
  if (!terminal || !code) return;

  const text = code.textContent ?? "";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    code.textContent = text;
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      code.textContent = "";
      [...text].forEach((_, index) => {
        window.setTimeout(() => {
          code.textContent = text.slice(0, index + 1);
        }, index * 12);
      });
    },
    { threshold: 0.28 }
  );
  observer.observe(terminal);
}
