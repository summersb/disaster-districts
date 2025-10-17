type AddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

type GeoPoint = {
  lat: number
  lng: number
}

type GeoBox = {
  northeast: GeoPoint
  southwest: GeoPoint
}

type Geometry = {
  bounds: GeoBox
  location: GeoPoint
  location_type: string
  viewport: GeoBox
}

type Result = {
  address_components: AddressComponent[]
  formatted_address: string
  geometry: Geometry
  place_id: string
  types: string[]
}

type Results = {
  results: Result[]
  status: string
}

export type { AddressComponent, GeoPoint, GeoBox, Geometry, Result, Results }