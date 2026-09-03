import haversine from 'haversine'
import type { MemberDto } from '@/type'

export type GeocodeResult = {
  lat: number
  lng: number
  displayName: string
}

// Looks an address up against OpenStreetMap's free Nominatim geocoder.
// Nominatim's usage policy (max ~1 request/sec, no bulk/automated use)
// is fine here since this only ever runs on a single explicit user click.
export const geocodeAddress = async (
  address: string,
): Promise<GeocodeResult[]> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(address)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('OpenStreetMap lookup failed')
  }
  const results: { lat: string; lon: string; display_name: string }[] =
    await res.json()
  return results.map((r) => ({
    lat: Number(r.lat),
    lng: Number(r.lon),
    displayName: r.display_name,
  }))
}

// Prefer the single pre-formatted address field; fall back to assembling
// one from the individual parts if it's missing.
export const memberAddressQuery = (member: MemberDto): string =>
  member.formattedAddress?.trim() ||
  [
    member.address1,
    member.city,
    [member.state, member.postalCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

export const deClutter = (members: MemberDto[]): MemberDto[] => {
  if (!members) {
    return []
  }
  const validLatLng = members.filter((m) => m?.lat != null && m?.lng != null)

  return validLatLng.map((m) => {
    if (m.lat == null || m.lng == null) {
      return m
    }
    const start = { latitude: m.lat, longitude: m.lng }

    const toClose = validLatLng
      .filter((mm) => mm.id !== m.id)
      .find((otherM) => {
        if (otherM.lat == null || otherM.lng == null) {
          return undefined
        }
        const end = { latitude: otherM.lat, longitude: otherM.lng }
        const distance = haversine(start, end)
        return distance < 0.01
      })
    if (toClose) {
      return {
        ...m,
        lat: (m?.lat ?? 0) + 0.0005,
      }
    }
    return m
  })
}
