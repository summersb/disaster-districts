import { createFileRoute } from '@tanstack/react-router'
import { MapPin, X } from 'lucide-react'
import { useState } from 'react'
import {
  type GeocodeResult,
  geocodeAddress,
  memberAddressQuery,
} from '@/components/mapUtils'
import MapDisplay from '@/components/OSMMapWithMarkers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers, useSaveMember } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import type { MemberDto } from '@/type'

export const Route = createFileRoute('/_protected/dashboard/map')({
  component: RouteComponent,
})

function RouteComponent() {
  const wardId = getWardId()
  const { data: districts = [] } = useDistricts(wardId)
  const { data: members = [] } = useMembers(wardId)
  const saveMember = useSaveMember()

  const [fixingPins, setFixingPins] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null)
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [looking, setLooking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const closePanel = () => {
    setSelectedMember(null)
    setResults(null)
    setError('')
  }

  const handleMemberSelected = (member: MemberDto) => {
    setSelectedMember(member)
    setResults(null)
    setError('')
  }

  const handleLookup = async () => {
    if (!selectedMember) return
    const query = memberAddressQuery(selectedMember)
    if (!query) {
      setError('This member has no address on file to look up.')
      return
    }
    setLooking(true)
    setError('')
    setResults(null)
    try {
      const found = await geocodeAddress(query)
      if (found.length === 0) {
        setError('No matches found on OpenStreetMap for this address.')
      }
      setResults(found)
    } catch {
      setError('OpenStreetMap lookup failed - try again.')
    } finally {
      setLooking(false)
    }
  }

  const applyResult = async (result: GeocodeResult) => {
    if (!selectedMember) return
    setApplying(true)
    setError('')
    try {
      const res = await saveMember.mutateAsync({
        wardId,
        memberId: selectedMember.id as number,
        member: { ...selectedMember, lat: result.lat, lng: result.lng },
      })
      if (!res.ok) throw new Error('Failed to save')
      closePanel()
    } catch {
      setError('Failed to save the new location - try again.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="h-screen relative">
      <div className="absolute z-[1000] top-2 left-2 flex flex-col items-start gap-2">
        <Button
          size="sm"
          variant={fixingPins ? 'default' : 'outline'}
          onClick={() => {
            setFixingPins((fixing) => !fixing)
            closePanel()
          }}
        >
          {fixingPins ? 'Done Fixing Pins' : 'Fix a Pin'}
        </Button>

        {fixingPins && !selectedMember && (
          <span className="text-xs rounded bg-background/90 px-2 py-1">
            Click a member's pin to look up its address on OpenStreetMap.
          </span>
        )}

        {selectedMember && (
          <Card className="w-80">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                {selectedMember.familyName}, {selectedMember.name}
              </CardTitle>
              <Button variant="ghost" size="icon-xs" onClick={closePanel}>
                <X className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {memberAddressQuery(selectedMember) || 'No address on file'}
              </p>
              <p className="text-xs text-muted-foreground">
                Current pin: {selectedMember.lat ?? '—'},{' '}
                {selectedMember.lng ?? '—'}
              </p>
              <Button size="sm" onClick={handleLookup} disabled={looking}>
                <MapPin className="h-3 w-3 mr-1" />
                {looking ? 'Looking up...' : 'Look Up on OpenStreetMap'}
              </Button>
              {error && <p className="text-xs text-destructive">{error}</p>}
              {results && results.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {results.map((r) => (
                    <li key={`${r.lat}-${r.lng}-${r.displayName}`}>
                      <button
                        type="button"
                        className="w-full rounded border p-2 text-left text-xs hover:bg-accent disabled:opacity-50"
                        disabled={applying}
                        onClick={() => applyResult(r)}
                      >
                        {r.displayName}
                        <span className="block text-muted-foreground">
                          {r.lat.toFixed(6)}, {r.lng.toFixed(6)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <MapDisplay
        districts={districts}
        members={members}
        showLabel={false}
        editable={fixingPins}
        onMemberSelected={handleMemberSelected}
      />
    </div>
  )
}
