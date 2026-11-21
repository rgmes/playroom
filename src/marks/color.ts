// Colour helpers for drawing a mark on top of a coloured disc.

const LIGHT_INK = '#ffffff';
const DARK_INK = '#2d2440';

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or dark ink, whichever stands out more on the given disc colour. */
export function inkFor(disc: string): string {
  return contrast(disc, LIGHT_INK) >= contrast(disc, DARK_INK) ? LIGHT_INK : DARK_INK;
}
