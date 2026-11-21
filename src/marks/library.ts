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
    id: 'critters',
    name: 'Critters',
    marks: [
      {
        id: 'frog',
        name: 'Frog',
        color: { light: '#2f9e44', dark: '#69db7c' },
        paths: [
          'M16 62 Q16 42 34 40 Q50 38 66 40 Q84 42 84 62 Q84 82 50 82 Q16 82 16 62 Z',
          `${circle(33, 32, 10)} ${circle(67, 32, 10)}`,
          'M33 31 V33 M67 31 V33',
          'M34 62 Q50 74 66 62',
        ],
        stroke: 7,
      },
      {
        id: 'fox',
        name: 'Fox',
        color: { light: '#e8590c', dark: '#ff922b' },
        paths: [
          'M16 18 L38 36 L62 36 L84 18 L78 52 L50 84 L22 52 Z',
          'M38 54 V56 M62 54 V56',
          'M45 70 H55 L50 75 Z',
        ],
        stroke: 7,
      },
    ],
  },
  {
    id: 'spooky',
    name: 'Spooky',
    marks: [
      {
        id: 'ghost',
        name: 'Ghost',
        color: { light: '#7048e8', dark: '#b197fc' },
        paths: [
          'M24 82 V44 Q24 16 50 16 Q76 16 76 44 V82 L67 74 L58 82 L50 74 L42 82 L33 74 Z',
          'M41 42 V48 M59 42 V48',
          circle(50, 60, 5),
        ],
        stroke: 7,
      },
      {
        id: 'pumpkin',
        name: 'Pumpkin',
        color: { light: '#f76707', dark: '#ffa94d' },
        paths: [
          'M50 32 Q82 26 84 56 Q84 82 50 82 Q16 82 16 56 Q18 26 50 32 Z',
          'M38 33 Q28 56 38 81 M62 33 Q72 56 62 81',
          'M50 32 Q49 22 57 15',
        ],
        stroke: 7,
      },
    ],
  },
  {
    id: 'space',
    name: 'Space',
    marks: [
      {
        id: 'robot',
        name: 'Robot',
        color: { light: '#1c7ed6', dark: '#74c0fc' },
        paths: [
          'M24 34 H76 V80 H24 Z',
          `M50 34 V22 ${circle(50, 16, 5)}`,
          'M38 52 H42 M58 52 H62',
          'M38 66 H62 M24 54 H16 M76 54 H84',
        ],
        stroke: 7,
      },
      {
        id: 'alien',
        name: 'Alien',
        color: { light: '#37b24d', dark: '#8ce99a' },
        paths: [
          'M50 14 Q82 16 80 46 Q76 74 50 86 Q24 74 20 46 Q18 16 50 14 Z',
          'M30 44 Q40 38 46 52 Q34 56 30 44 Z M70 44 Q60 38 54 52 Q66 56 70 44 Z',
          'M44 70 Q50 73 56 70',
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
