export function initSpecular(): void {
  const panes = document.querySelectorAll<HTMLElement>(".pane");
  for (const pane of panes) {
    let frame = 0;
    let x = 0;
    let y = 0;
    pane.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse") return;
        const rect = pane.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          pane.style.setProperty("--mx", `${x}px`);
          pane.style.setProperty("--my", `${y}px`);
          frame = 0;
        });
      },
      { passive: true }
    );
  }
}
