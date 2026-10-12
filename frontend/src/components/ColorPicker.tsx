import React from 'react'
import { DISTRICT_COLORS, UNASSIGNED_COLOR } from '@/lib/districtColors'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

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
    // The unassigned-member color isn't offered - unless a district already
    // has it (older data), so its current value still shows until changed.
    const colors = DISTRICT_COLORS.filter(
      (color) =>
        color.name !== UNASSIGNED_COLOR || color.name === selectedColor,
    )
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
