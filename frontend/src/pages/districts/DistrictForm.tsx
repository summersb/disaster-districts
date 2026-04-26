import { ColorPicker } from '@/components/ColorPicker.tsx'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { CommandInput } from '@/components/ui/command'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { cn } from '@/lib/utils'
import MapDisplay from '@/pages/map/MapDisplay'
import type { District, Member } from '@/type'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

type DistrictFormProps = {
  districtId: number
}

const DistrictForm = ({ districtId }: DistrictFormProps) => {
  const [openLeader, setOpenLeader] = useState(false)
  const [openAssistant, setOpenAssistant] = useState(false)
  const form = useFormContext()
  const {
    fields: districtMembers,
    append,
    remove,
  } = useFieldArray<District, 'members', 'id'>({
    // @ts-ignore
    control: form.control,
    name: 'members',
    // @ts-ignore
    keyName: '_id',
  })

  const wardId = getWardId()
  const { data } = useMembers(wardId)

  const { data: districts } = useDistricts(wardId)
  const color = form.watch('color')
  const leader = form.watch('leader')
  const assistant = form.watch('assistant')
  const lat = form.watch('lat') as number | undefined
  const lng = form.watch('lng') as number | undefined
  // update current district with current member list
  const currentDistrict = districts?.find((d) => d.id === districtId)
  // Members assigned to this district come from the ward member list filtered
  // by member.district.id; that's what gets shown on the edit map.
  const districtMemberList = (data ?? []).filter(
    (m) => m.district?.id === districtId,
  )

  const handleMapClick = (clickedLat: number, clickedLng: number) => {
    form.setValue('lat', clickedLat, { shouldDirty: true })
    form.setValue('lng', clickedLng, { shouldDirty: true })
  }
  if (currentDistrict) {
    currentDistrict.members = districtMembers.map((m) => m.id)
    if (leader) {
      currentDistrict.members.push(leader.id)
    }
    if (assistant) {
      currentDistrict.members.push(assistant.id)
    }
    if (currentDistrict.color) {
      currentDistrict.color = color
    }
  }

  const memberClicked = (member: Member) => {
    if (districtMembers.find((m) => m.id === member.id)) {
      districtMembers.forEach((m, idx) => {
        if (m.id === member.id) {
          remove(idx)
        }
      })
    } else {
      append(member)
      // TODO remove member from other districts
    }
  }

  const memberList: Member[] = data ?? []
  const leaderList = memberList?.filter((m) => m.id !== assistant?.id)
  const assistantList = memberList?.filter((m) => m.id !== leader?.id)

  return (
    <>
      <div className="flex mb-4 ">
        <div className="w-1/4 ml-2">
          <div className="mb-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District Name</FormLabel>
                  <FormControl>
                    <div className="mb-4 text-black bg-slate-500">
                      <Input
                        placeholder="District name"
                        {...field}
                        className="text-white bg-gray-900"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mb-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="mb-4 text-black bg-slate-500">
                      <ColorPicker
                        selectedColor={field.value}
                        setSelectedColor={(color) => {
                          form.setValue('color', color)
                        }}
                        className="text-white bg-gray-900"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mb-4">
            <FormLabel
              className={cn(form.formState.errors.leader && 'text-destructive')}
            >
              Leader
            </FormLabel>
            <Popover open={openLeader} onOpenChange={setOpenLeader}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  {leader?.id ? (
                    <MemberDisplayName member={leader} />
                  ) : (
                    <>Select district leader</>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" side="bottom" align="start">
                <Command>
                  <CommandInput placeholder="Leader" />
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {leaderList?.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={String(member.id)}
                          keywords={[
                            member.familyName,
                            member.name,
                            member.address1 ?? '',
                            member?.formattedAddress ?? '',
                          ]}
                          onSelect={() => {
                            form.setValue('leader', member)
                            setOpenLeader(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              leader?.id === member.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <MemberDisplayName member={member} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.leader && (
              <div className="text-sm font-medium text-destructive">
                Leader must be selected
              </div>
            )}
          </div>

          <div className="mb-4">
            <FormLabel>Assistant Leader</FormLabel>
            <Popover open={openAssistant} onOpenChange={setOpenAssistant}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  {assistant?.id ? (
                    <MemberDisplayName member={assistant} />
                  ) : (
                    <>Select district assistant leader</>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" side="bottom" align="start">
                <Command>
                  <CommandInput placeholder="Assistant Leader" />
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {assistantList?.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={String(member.id)}
                          keywords={[
                            member.familyName,
                            member.name,
                            member.address1 ?? '',
                            member.formattedAddress ?? '',
                          ]}
                          onSelect={() => {
                            form.setValue('assistant', member)
                            setOpenAssistant(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              assistant?.id === member.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <MemberDisplayName member={member} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="mb-4 flex gap-2">
            <FormField
              control={form.control}
              name="lat"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Center latitude</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="lat"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? undefined : Number(e.target.value),
                        )
                      }
                      className="text-white bg-gray-900"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lng"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Center longitude</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="lng"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? undefined : Number(e.target.value),
                        )
                      }
                      className="text-white bg-gray-900"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Click anywhere on the map to move the district center.
          </p>

          <div className="flex mb-4">
            <div className="w-1/2 mr-2">
              <label htmlFor="districtMembers" className="block font-bold mb-2">
                Members
              </label>
            </div>
            <div className="w-1/2 mr-2">
              <label htmlFor="map" className="block font-bold mb-2">
                Map
              </label>
            </div>
          </div>

          <div className="flex mb-4 h-[500px]">
            <div className="w-1/2 mr-2">
              <ul>
                {districtMembers
                  ?.sort((m1, m2) =>
                    m1?.familyName?.localeCompare(m2?.familyName),
                  )
                  .map((field, idx: number) => (
                    <li
                      className="odd:bg-slate-700 even:bg-slate-900 "
                      key={idx}
                    >
                      <MemberDisplayName member={field as Member} />
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
        {districts && (
          <div className="w-3/4 ml-2 h-[600px]">
            <MapDisplay
              districts={
                currentDistrict
                  ? [
                      {
                        ...(currentDistrict as any),
                        lat: lat ?? (currentDistrict as any)?.lat,
                        lng: lng ?? (currentDistrict as any)?.lng,
                      } as District,
                    ]
                  : []
              }
              members={districtMemberList}
              lat={lat ?? (currentDistrict as any)?.lat ?? leader?.lat}
              lng={lng ?? (currentDistrict as any)?.lng ?? leader?.lng}
              leader={leader}
              markerClicked={memberClicked}
              onMapClick={handleMapClick}
              showLabel
            />
          </div>
        )}
      </div>
    </>
  )
}
export default DistrictForm
