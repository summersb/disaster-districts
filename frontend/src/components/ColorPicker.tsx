import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

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
  { name: 'Bright Green', value: '#8FFF33' },
]

export interface ColorPickerProps {
  selectedColor: string
  setSelectedColor: (color: string) => void
  disabled?: boolean
  className?: string
}

const ColorPicker = React.forwardRef<HTMLButtonElement, ColorPickerProps>(
  ({ selectedColor, setSelectedColor, disabled, className }, ref) => {
    // Radix's Select fires onValueChange("") from its hidden native <select>
    // bubble proxy before its SelectItem collection has registered the
    // programmatically-set value (e.g. right after a react-hook-form reset).
    // No color name is ever legitimately empty, so ignore that spurious call
    // instead of clobbering the real value.
    const handleValueChange = (color: string) => {
      if (!color) return
      setSelectedColor(color)
    }
    return (
      <Select
        value={selectedColor}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger ref={ref} className={className} disabled={disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {colors.map((color) => (
            <SelectItem key={color.name} value={color.name}>
              <span className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: color.value }}
                />
                {color.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  },
)
ColorPicker.displayName = 'ColorPicker'

export { ColorPicker }
