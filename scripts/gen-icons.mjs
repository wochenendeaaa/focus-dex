import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// 16x16 pixel-art tomato (Pomodoro) on the app's dark-navy background.
// Legend: . = background, O = tomato body, Y = highlight, G = leaf
const GRID = [
  "................",
  "................",
  "......GG.GG.....",
  ".......GGG......",
  "........G.......",
  "....OOOOOOOO....",
  "...OOOOOOOOOO...",
  "..OOYOOOOOOOOO..",
  "..OYYOOOOOOOOO..",
  "..OOYOOOOOOOOO..",
  "..OOOOOOOOOOOO..",
  "..OOOOOOOOOOOO..",
  "...OOOOOOOOOO...",
  "....OOOOOOOO....",
  "................",
  "................",
];

// Sweetie-16 colors, matching src/styles/tokens.css
const COLORS = { ".": "#1a1c2c", O: "#ef7d57", Y: "#ffcd75", G: "#38b764" };

function gridToSvg() {
  const rects = [];
  GRID.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[ch]}"/>`);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="512" height="512" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

const svg = gridToSvg();
await mkdir("public/icons", { recursive: true });
await writeFile("public/favicon.svg", svg);
for (const [size, name] of [[192, "icon-192.png"], [512, "icon-512.png"], [180, "apple-touch-icon.png"]]) {
  await sharp(Buffer.from(svg)).resize(size, size, { kernel: "nearest" }).png().toFile(`public/icons/${name}`);
}
console.log("Icons generated.");
