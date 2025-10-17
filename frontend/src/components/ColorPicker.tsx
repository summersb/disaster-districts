import React from 'react'
import { cn } from '@/lib/utils.ts'

const colors = [
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
  { name: 'Bright Green', value: '#8FFF33' }
]

export interface ColorPickerProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  selectedColor: string
  setSelectedColor: (color: string) => void
}

const ColorPicker = React.forwardRef<HTMLSelectElement, ColorPickerProps>(
  (
    { className, selectedColor, setSelectedColor, ...props },
    ref
  ): React.ReactElement => {
    const selectedColorObj = colors.find(
      (color) => color.name === selectedColor
    )
    return (
      <select
        value={selectedColor}
        onChange={(e) => setSelectedColor(e.target.value)}
        className={cn(
          'flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{ color: selectedColorObj?.value ?? 'green' }}
        ref={ref}
        {...props}
      >
        {colors.map((color, index) => (
          <option key={index} value={color.name} style={{ color: color.value }}>
            {color.name}
          </option>
        ))}
      </select>
    )
  }
)
ColorPicker.displayName = 'ColorPicker'

export { ColorPicker }
