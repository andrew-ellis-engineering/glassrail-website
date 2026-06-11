export function initSpecular(): void {
  const panes = document.querySelectorAll<HTMLElement>(".pane");
  for (const pane of panes) {
    pane.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse") return;
        const rect = pane.getBoundingClientRect();
        pane.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        pane.style.setProperty("--my", `${event.clientY - rect.top}px`);
      },
      { passive: true }
    );
  }
}
