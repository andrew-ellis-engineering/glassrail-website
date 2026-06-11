export function initCopyButtons(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-copy]");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const value = button.dataset.copy;
      if (!value) return;
      void navigator.clipboard?.writeText(value);
      const label = button.querySelector<HTMLElement>(".copy-label");
      const previous = label?.textContent ?? "";
      button.classList.add("copied");
      if (label) label.textContent = "copied";
      window.setTimeout(() => {
        button.classList.remove("copied");
        if (label) label.textContent = previous || "copy";
      }, 1100);
    });
  }
}
