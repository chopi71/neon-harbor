// Colour grades: a canvas filter applied to each photo as it is drawn, a translucent gradient washed over the
// whole cover, and a vignette strength. Together they give a photo the poster's sunset or neon cast without
// touching the photo itself.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.02)',
    wash: [
      [0, 'rgba(24, 0, 54, 0.30)'],
      [0.45, 'rgba(255, 90, 60, 0.06)'],
      [0.75, 'rgba(255, 45, 120, 0.16)'],
      [1, 'rgba(120, 10, 80, 0.38)'],
    ],
    vignette: 0.35,
  },
  {
    id: 'neon',
    name: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.96)',
    wash: [
      [0, 'rgba(2, 0, 26, 0.42)'],
      [0.5, 'rgba(64, 0, 110, 0.10)'],
      [1, 'rgba(0, 40, 90, 0.40)'],
    ],
    vignette: 0.5,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'sepia(0.28) saturate(1.25) contrast(1.04) brightness(1.06)',
    wash: [
      [0, 'rgba(70, 30, 0, 0.10)'],
      [0.6, 'rgba(255, 150, 40, 0.10)'],
      [1, 'rgba(160, 60, 0, 0.30)'],
    ],
    vignette: 0.25,
  },
  {
    id: 'clean',
    name: 'Clean',
    filter: 'saturate(1.06) contrast(1.03)',
    wash: [
      [0, 'rgba(0, 0, 0, 0.05)'],
      [1, 'rgba(0, 0, 0, 0.14)'],
    ],
    vignette: 0.15,
  },
  {
    id: 'noir',
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(0.98)',
    wash: [
      [0, 'rgba(0, 0, 0, 0.25)'],
      [1, 'rgba(0, 0, 0, 0.45)'],
    ],
    vignette: 0.6,
  },
];

/** The grade with this id, or the first grade when the id is unknown. */
export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}
