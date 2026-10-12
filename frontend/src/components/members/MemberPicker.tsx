import { Check, ChevronsUpDown } from 'lucide-react'
import type React from 'react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMembers } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import type { MemberDto } from '@/type'

const memberName = (member: MemberDto) => `${member.familyName}, ${member.name}`

type MemberPickerProps = {
  // The ward whose members are offered.
  wardId: number
  // Selected member id; 0 means none.
  value: number
  onChange: (memberId: number) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

// A searchable dropdown of one ward's members, with a way to clear it.
const MemberPicker = ({
  wardId,
  value,
  onChange,
  placeholder = 'Choose member',
  label = 'Choose member',
  disabled,
  className,
}: MemberPickerProps): React.ReactElement => {
  const { data: members = [] } = useMembers(wardId)
  const [open, setOpen] = useState(false)
  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => memberName(a).localeCompare(memberName(b))),
    [members],
  )
  const chosen = members.find((member) => member.id === value)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={label}
            disabled={disabled}
            className="max-w-64 justify-between"
          >
            <span className="truncate">
              {chosen ? memberName(chosen) : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="bottom" align="start">
          <Command>
            <CommandInput placeholder="Search members" />
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {sorted.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={String(member.id)}
                    keywords={[member.familyName, member.name]}
                    onSelect={() => {
                      onChange(member.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === member.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {memberName(member)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {chosen && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChange(0)}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

export default MemberPicker
