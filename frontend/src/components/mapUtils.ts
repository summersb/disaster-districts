import type { Member } from '@/type'
import haversine from 'haversine'

export const deClutter = (members: Member[]): Member[] => {
  if (!members) {
    return []
  }
  const validLatLng = members.filter(
    (m) => m?.lat !== undefined && m?.lng !== undefined,
  )

  return validLatLng.map((m) => {
    if (m.lat === undefined || m.lng === undefined) {
      return m
    }
    const start = { latitude: m.lat, longitude: m.lng }

    const toClose = validLatLng
      .filter((mm) => mm.id !== m.id)
      .find((otherM) => {
        if (otherM.lat === undefined || otherM.lng === undefined) {
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
