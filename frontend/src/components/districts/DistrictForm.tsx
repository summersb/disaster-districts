import { Check, ChevronsUpDown, Crosshair } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { ColorPicker } from '@/components/ColorPicker.tsx'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkers'
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
import { useWard } from '@/hooks/useWards'
import { getWardId } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { DistrictDto, MemberDto } from '@/type'

// Same default zoom as the ward map (routes/_protected/dashboard/map.tsx).
const WARD_VIEW_RADIUS_MILES = 5
// Editing or viewing a district zooms to this far around the district center.
const DISTRICT_VIEW_RADIUS_MILES = 1

type DistrictFormProps = {
  districtId: number
  readOnly?: boolean
}

const DistrictForm = ({ districtId, readOnly = false }: DistrictFormProps) => {
  const [openLeader, setOpenLeader] = useState(false)
  const [openAssistant, setOpenAssistant] = useState(false)
  const [pickingCenter, setPickingCenter] = useState(false)
  const form = useFormContext()
  const {
    fields: districtMembers,
    append,
    remove,
  } = useFieldArray<DistrictDto, 'members', 'id'>({
    // @ts-expect-error
    control: form.control,
    name: 'members',
    // @ts-expect-error
    keyName: '_id',
  })

  const wardId = getWardId()
  const { data } = useMembers(wardId)

  const { data: districts } = useDistricts(wardId)
  const { data: ward } = useWard(wardId)
  const color = form.watch('color')
  const leader = form.watch('leader')
  const assistant = form.watch('assistant')
  const lat = form.watch('lat') as number | undefined
  const lng = form.watch('lng') as number | undefined
  const currentDistrict = districts?.find((d) => d.id === districtId)
  const allWardMembers = data ?? []
  const pendingMemberIds = new Set<number>(
    districtMembers.map((m) => (m as unknown as MemberDto).id),
  )
  // Members shown in the side list = pending roster of THIS district.
  const districtMemberList = allWardMembers.filter((m) =>
    pendingMemberIds.has(m.id),
  )

  // Build the member list for the map: every ward member, but with the
  // pending roster overridden to this district so their pin shows in this
  // district's color before save.
  const mapMembers = allWardMembers.map((m) =>
    pendingMemberIds.has(m.id)
      ? {
          ...m,
          district: {
            id: districtId,
            name: currentDistrict?.name,
            color,
          },
        }
      : m,
  )

  // Only pass a center when we actually have coordinates; otherwise leave it
  // undefined so OSMMapWithMarkers falls back to the ward members' average.
  const resolvedLat = lat ?? currentDistrict?.lat ?? leader?.lat
  const resolvedLng = lng ?? currentDistrict?.lng ?? leader?.lng
  const resolvedCenter =
    resolvedLat != null && resolvedLng != null
      ? { lat: resolvedLat, lng: resolvedLng }
      : undefined

  // A new district has no position of its own yet, so open its map the same
  // way the ward map opens: 5 miles around the ward center. Without a saved
  // ward center it falls back to the behavior above.
  const wardCenter =
    ward?.lat != null && ward?.lng != null
      ? { lat: ward.lat, lng: ward.lng }
      : undefined
  const useWardView = districtId === 0 && wardCenter != null
  // An existing district opens close in on its own center instead.
  const useDistrictView = districtId !== 0 && resolvedCenter != null
  const defaultRadiusMiles = useWardView
    ? WARD_VIEW_RADIUS_MILES
    : useDistrictView
      ? DISTRICT_VIEW_RADIUS_MILES
      : undefined

  // For the map's districts list, mirror the form's pending leader/assistant
  // so the Leader-/Assistant- icons follow the current selection.
  const mapDistricts = (districts ?? []).map((d) => {
    if (d.id !== districtId) return d
    return {
      ...d,
      lat: lat ?? d.lat,
      lng: lng ?? d.lng,
      color,
      leaderId: leader?.id ?? d.leaderId ?? null,
      assistantId: assistant?.id ?? d.assistantId ?? null,
    }
  })

  const handleMapClick = (clickedLat: number, clickedLng: number) => {
    if (!pickingCenter) return
    form.setValue('lat', clickedLat, { shouldDirty: true })
    form.setValue('lng', clickedLng, { shouldDirty: true })
    setPickingCenter(false)
  }

  const memberClicked = (member: MemberDto) => {
    if (readOnly) return
    // Leaders/assistants of any district are locked; ignore clicks on them.
    const isLeaderOrAssistant = (districts ?? []).some(
      (d) => d.leaderId === member.id || d.assistantId === member.id,
    )
    if (isLeaderOrAssistant) return
    const existingIdx = districtMembers.findIndex((m) => m.id === member.id)
    if (existingIdx >= 0) {
      // Already in this district's pending roster → click again to detach.
      remove(existingIdx)
    } else {
      // Move into this district. The previous district loses them
      // automatically on save (PUT memberIds reassigns to this district).
      append(member)
    }
  }

  // Leaders/assistants must come from the district's own membership. Fall back
  // to including the currently-selected member even if they aren't in the list
  // (e.g. legacy data) so the picker doesn't lose the existing selection.
  const leaderCandidates =
    leader && !districtMemberList.some((m) => m.id === leader.id)
      ? [...districtMemberList, leader as MemberDto]
      : districtMemberList
  const assistantCandidates =
    assistant && !districtMemberList.some((m) => m.id === assistant.id)
      ? [...districtMemberList, assistant as MemberDto]
      : districtMemberList
  const leaderList = leaderCandidates.filter((m) => m.id !== assistant?.id)
  const assistantList = assistantCandidates.filter((m) => m.id !== leader?.id)

  return (
    // Stretches to whatever height the page gives it: the fields scroll on
    // their own and the map fills the rest.
    <div className="flex min-h-0 flex-1">
      <div className="w-1/3 overflow-y-auto pr-2">
        <div className="mb-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>District Name</FormLabel>
                <FormControl>
                  <div className="mb-4">
                    <Input
                      placeholder="District name"
                      disabled={readOnly}
                      {...field}
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
                  <div className="mb-4">
                    <ColorPicker
                      selectedColor={field.value}
                      setSelectedColor={(color) => {
                        form.setValue('color', color, { shouldDirty: true })
                      }}
                      disabled={readOnly}
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
                disabled={readOnly}
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
                          form.setValue('leader', member, { shouldDirty: true })
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
                disabled={readOnly}
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
                          form.setValue('assistant', member, {
                            shouldDirty: true,
                          })
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
                    disabled={readOnly}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ''
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
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
                    disabled={readOnly}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ''
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        {!readOnly && (
          <div className="mb-2 flex items-center gap-2">
            <Button
              type="button"
              variant={pickingCenter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPickingCenter((p) => !p)}
              title="Pick center on the map"
            >
              <Crosshair className="h-4 w-4 mr-1" />
              {pickingCenter ? 'Click on map…' : 'Pick center on map'}
            </Button>
            {pickingCenter && (
              <span className="text-sm text-muted-foreground">
                Click anywhere on the map to set the center.
              </span>
            )}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="districtMembers" className="block font-bold mb-2">
            Members ({districtMembers.length})
          </label>
          <ul>
            {/* Sort a copy: sorting districtMembers itself reorders the field
                array in place, so its indexes stop matching the form's and
                remove() takes out the wrong member. */}
            {[...districtMembers]
              .sort((m1, m2) => m1?.familyName?.localeCompare(m2?.familyName))
              .map((field) => (
                <li className="odd:bg-muted" key={field.id}>
                  <MemberDisplayName member={field as MemberDto} />
                </li>
              ))}
          </ul>
        </div>
      </div>
      {districts && (
        <div className="w-2/3 ml-2 h-full min-h-[400px]">
          <OSMMapWithMarkers
            districts={mapDistricts as DistrictDto[]}
            members={mapMembers as MemberDto[]}
            center={useWardView ? wardCenter : resolvedCenter}
            defaultRadiusMiles={defaultRadiusMiles}
            showOutsideStatus={false}
            districtLinks={false}
            markerClicked={readOnly ? undefined : memberClicked}
            onMapClick={!readOnly && pickingCenter ? handleMapClick : undefined}
            showLabel
          />
        </div>
      )}
    </div>
  )
}
export default DistrictForm
