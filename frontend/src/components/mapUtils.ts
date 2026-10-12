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

type Pixel = { x: number; y: number }
type LatLng = { lat: number; lng: number }

// A member's pin as drawn. `actual` is set only when the pin was moved off its
// real location to make room, so the caller can draw a line back to it.
export type PlacedPin = {
  member: MemberDto
  lat: number
  lng: number
  actual?: LatLng
}

// Pins closer together than this (in screen pixels) cover each other enough
// that the one underneath is hard to click. A pin is 25px wide.
const MIN_SEPARATION_PX = 24
// How far a pin may be drawn from its real location. In a dense area this
// stops the pins from spreading into a blob far from where anyone lives;
// zooming in gives them room instead.
const MAX_SHIFT_PX = 48
// A pin nudged by less than this is drawn at its real location, without a
// line.
const MIN_SHIFT_PX = 3
const MAX_PASSES = 40

/**
 * Nudges pins that sit on top of each other (same household, neighbouring
 * units) apart so each can be clicked. Works in screen pixels, so it has to
 * be re-run when the zoom changes: `toPixel`/`toLatLng` convert at the
 * current zoom. Members without coordinates are dropped.
 */
export const spreadOverlappingPins = (
  members: MemberDto[],
  toPixel: (point: LatLng) => Pixel,
  toLatLng: (pixel: Pixel) => LatLng,
): PlacedPin[] => {
  const pins = (members ?? [])
    .filter((m) => m?.lat != null && m?.lng != null)
    // A stable order makes the result the same from one render to the next.
    .sort((a, b) => a.id - b.id)
    .map((member) => {
      const actual = { lat: member.lat as number, lng: member.lng as number }
      const origin = toPixel(actual)
      return { member, actual, origin, x: origin.x, y: origin.y }
    })

  // Repeatedly push every too-close pair apart along the line between them,
  // until nothing overlaps (or it stops improving in a crowded spot).
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let moved = false
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i]
        const b = pins[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        if (
          Math.abs(dx) >= MIN_SEPARATION_PX ||
          Math.abs(dy) >= MIN_SEPARATION_PX
        ) {
          continue
        }
        let distance = Math.hypot(dx, dy)
        if (distance >= MIN_SEPARATION_PX) continue
        if (distance < 0.01) {
          // Exactly the same spot: pick a direction that depends only on
          // which pins they are, so it doesn't change between renders.
          const angle = (i * 7 + j * 13) * 2.399963
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          distance = 1
        }
        const push = (MIN_SEPARATION_PX - Math.hypot(b.x - a.x, b.y - a.y)) / 2
        a.x -= (dx / distance) * push
        a.y -= (dy / distance) * push
        b.x += (dx / distance) * push
        b.y += (dy / distance) * push
        moved = true
      }
    }
    for (const pin of pins) {
      const shift = Math.hypot(pin.x - pin.origin.x, pin.y - pin.origin.y)
      if (shift > MAX_SHIFT_PX) {
        pin.x = pin.origin.x + ((pin.x - pin.origin.x) / shift) * MAX_SHIFT_PX
        pin.y = pin.origin.y + ((pin.y - pin.origin.y) / shift) * MAX_SHIFT_PX
      }
    }
    if (!moved) break
  }

  return pins.map((pin) => {
    const shift = Math.hypot(pin.x - pin.origin.x, pin.y - pin.origin.y)
    if (shift < MIN_SHIFT_PX) return { member: pin.member, ...pin.actual }
    return {
      member: pin.member,
      ...toLatLng({ x: pin.x, y: pin.y }),
      actual: pin.actual,
    }
  })
}
