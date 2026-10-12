// Color names match the pin SVG filenames in /public/images (e.g. Red.svg,
// Leader-Red.svg); `value` is the swatch shown next to the name.
export const DISTRICT_COLORS = [
  { name: 'Red', value: '#FF5733' },
  { name: 'Green', value: '#33FF57' },
  { name: 'Blue', value: '#3357FF' },
  { name: 'Pink', value: '#FF33A1' },
  { name: 'Orange', value: '#FF8F33' },
  { name: 'Cyan', value: '#33FFF1' },
  { name: 'Dark Red', value: '#FF3333' },
  { name: 'Purple', value: '#8F33FF' },
  { name: 'Yellow', value: '#FFFF33' },
  { name: 'Lime', value: '#33FF8F' },
  { name: 'Indigo', value: '#5733FF' },
  { name: 'Violet', value: '#A133FF' },
  { name: 'Teal', value: '#33FFA1' },
  { name: 'Bright Red', value: '#FF5733' },
  { name: 'Scarlet', value: '#FF3333' },
  { name: 'Sky Blue', value: '#33A1FF' },
  { name: 'Dark Orange', value: '#FF8F33' },
  { name: 'Light Green', value: '#33FF57' },
  { name: 'Magenta', value: '#FF33FF' },
  { name: 'Bright Green', value: '#8FFF33' },
]

// The pin color the map gives members who aren't in any district. Districts
// can't choose it, or their members would look unassigned.
export const UNASSIGNED_COLOR = 'Blue'
