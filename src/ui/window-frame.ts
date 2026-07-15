export function windowFrame(...children: HTMLElement[]): HTMLDivElement {
  const frame = document.createElement("div");
  frame.className = "window-frame";
  frame.append(...children);
  return frame;
}
