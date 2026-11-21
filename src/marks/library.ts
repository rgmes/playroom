// The mark library. Each set is a pair of marks the players use instead of X and O.
//
// Rules for adding a set:
//  - The two marks must differ in SHAPE, not just colour (colour-blind players).
//  - Draw on a 100x100 canvas with strokes so the "draw-in" animation works.
//  - `paths` are drawn in order; `fill: true` fades a fill in after the outline is drawn.
//  - Give a light-theme and a dark-theme colour with decent contrast on each background.

export interface MarkDef {
  id: string;
  /** Used in game text and screen-reader labels, e.g. "Plus wins!" */
  name: string;
  color: { light: string; dark: string };
  paths: string[];
  fill?: boolean;
  /** Stroke width on the 100x100 canvas. Defaults to 11. */
  stroke?: number;
}

export interface MarkSet {
  id: string;
  name: string;
  marks: [MarkDef, MarkDef];
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} a${r} ${r} 0 1 1 0 ${2 * r} a${r} ${r} 0 1 1 0 ${-2 * r}`;

export const MARK_SETS: MarkSet[] = [
  {
    id: 'classic',
    name: 'Classic',
    marks: [
      {
        id: 'x',
        name: 'X',
        color: { light: '#e5484d', dark: '#ff7b80' },
        paths: ['M27 27 L73 73', 'M73 27 L27 73'],
        stroke: 12,
      },
      {
        id: 'o',
        name: 'O',
        color: { light: '#2f7fe0', dark: '#6aaeff' },
        paths: [circle(50, 50, 25)],
        stroke: 12,
      },
    ],
  },
  {
    id: 'math',
    name: 'Math',
    marks: [
      {
        id: 'plus',
        name: 'Plus',
        color: { light: '#1f9d6b', dark: '#4fd39e' },
        paths: ['M50 22 V78', 'M22 50 H78'],
        stroke: 13,
      },
      {
        id: 'minus',
        name: 'Minus',
        color: { light: '#8a4fd6', dark: '#b48bff' },
        paths: ['M20 50 H80'],
        stroke: 15,
      },
    ],
  },
  {
    id: 'sky',
    name: 'Sky',
    marks: [
      {
        id: 'sun',
        name: 'Sun',
        color: { light: '#e07c00', dark: '#ffb347' },
        paths: [
          circle(50, 50, 15),
          'M50 13 V22 M50 78 V87 M13 50 H22 M78 50 H87 M24 24 L30 30 M76 24 L70 30 M24 76 L30 70 M76 76 L70 70',
        ],
        stroke: 9,
      },
      {
        id: 'moon',
        name: 'Moon',
        color: { light: '#4b5bd6', dark: '#9aa5ff' },
        paths: ['M45.2 20.4 A30 30 0 1 0 78.7 58.7 A26 26 0 0 1 45.2 20.4 Z'],
        fill: true,
        stroke: 8,
      },
    ],
  },
  {
    id: 'love',
    name: 'Sweet',
    marks: [
      {
        id: 'heart',
        name: 'Heart',
        color: { light: '#e0457b', dark: '#ff7fab' },
        paths: [
          'M50 80 C20 60 14 42 22 30 C30 18 46 20 50 34 C54 20 70 18 78 30 C86 42 80 60 50 80 Z',
        ],
        fill: true,
        stroke: 8,
      },
      {
        id: 'star',
        name: 'Star',
        color: { light: '#b07f00', dark: '#ffd23f' },
        paths: [
          'M50 18 L58.6 39.9 L82 41.4 L63.9 56.4 L69.8 79.3 L50 66.6 L30.2 79.3 L36.1 56.4 L18 41.4 L41.4 39.9 Z',
        ],
        fill: true,
        stroke: 8,
      },
    ],
  },
  {
    id: 'pets',
    name: 'Pets',
    marks: [
      {
        id: 'cat',
        name: 'Cat',
        color: { light: '#d9622b', dark: '#ff9a62' },
        paths: [
          'M25 46 L27 18 L42 31 Q50 29 58 31 L73 18 L75 46 Q78 76 50 78 Q22 76 25 46 Z',
          'M40 48 V50 M60 48 V50',
          'M46 60 Q50 64 54 60',
        ],
        stroke: 7,
      },
      {
        id: 'dog',
        name: 'Dog',
        color: { light: '#128a8a', dark: '#4fd1d1' },
        paths: [
          'M33 30 Q50 20 67 30 Q75 50 67 70 Q50 82 33 70 Q25 50 33 30 Z',
          'M33 30 Q15 28 17 58 Q24 62 29 52 M67 30 Q85 28 83 58 Q76 62 71 52',
          'M42 46 V48 M58 46 V48',
          'M45 60 Q50 65 55 60',
        ],
        stroke: 7,
      },
    ],
  },
  {
    id: 'shapes',
    name: 'Shapes',
    marks: [
      {
        id: 'triangle',
        name: 'Triangle',
        color: { light: '#2b8a3e', dark: '#69db7c' },
        paths: ['M50 20 L81 75 L19 75 Z'],
        stroke: 11,
      },
      {
        id: 'square',
        name: 'Square',
        color: { light: '#e8590c', dark: '#ff922b' },
        paths: ['M25 25 H75 V75 H25 Z'],
        stroke: 11,
      },
    ],
  },
];

export const DEFAULT_SET_ID = 'classic';

export function getMarkSet(id: string): MarkSet {
  return MARK_SETS.find((s) => s.id === id) ?? MARK_SETS[0];
}
