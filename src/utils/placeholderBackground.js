const PALETTES = [
  { a: "#065f46", b: "#011c16" }, // emerald
  { a: "#1e3a5f", b: "#060e1c" }, // navy
  { a: "#3b1f5e", b: "#0e0618" }, // purple
  { a: "#312e81", b: "#0d0c25" }, // indigo
  { a: "#881337", b: "#200610" }, // rose
  { a: "#134e4a", b: "#031310" }, // teal
  { a: "#78350f", b: "#1c0b02" }, // amber
  { a: "#1e293b", b: "#060a10" }, // slate
];

function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getPlaceholderBackground(seed) {
  const key = String(seed ?? "");
  const palette = PALETTES[hashSeed(key) % PALETTES.length];
  const svg = `<svg viewBox="0 0 280 185" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="280" height="185" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="280" y2="185" gradientUnits="userSpaceOnUse"><stop stop-color="${palette.a}"/><stop offset="1" stop-color="${palette.b}"/></linearGradient></defs><text x="140" y="100" font-size="56" text-anchor="middle" fill="rgba(255,255,255,0.08)" font-family="serif">◈</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
