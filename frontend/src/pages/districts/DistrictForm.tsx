import { useState } from 'react'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { CommandInput } from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'
import MapDisplay from '@/pages/map/MapDisplay'
import { useQuery } from '@tanstack/react-query'
import { getDistrictList, getMemberList } from '@/api'
import type { District, Member } from '@/type'
import { ColorPicker } from '@/components/ColorPicker.tsx'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'

type DistrictFormProps = {
  districtId: string
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

  const { data } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
  })

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: getDistrictList,
  })
  const color = form.watch('color')
  const leader = form.watch('leader')
  const assistant = form.watch('assistant')
  // update current district with current member list
  const currentDistrict = districts?.find((d) => d.id === districtId)
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
                          value={member.id}
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
                          value={member.id}
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
          <div className="w-3/4 ml-2">
            <MapDisplay
              districts={districts}
              members={memberList}
              lat={leader?.lat ?? 33.1928423}
              lng={leader?.lng ?? -117.2413057}
              leader={leader}
              markerClicked={memberClicked}
              showLabel
            />
          </div>
        )}
      </div>
    </>
  )
}
export default DistrictForm
