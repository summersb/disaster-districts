import type React from 'react'
import { useEffect, useState } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

type Position = {
  lat: number
  lng: number
}

type OSMLocationPickerProps = {
  value?: Position
  onChange: (pos: Position) => void
  defaultCenter?: Position
  zoom?: number
  className?: string
}

const DEFAULT_CENTER: Position = { lat: 39.8283, lng: -98.5795 }

function markerIcon(): L.Icon {
  return new L.Icon({
    iconUrl: '/images/Blue.svg',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  })
}

function RecenterMap({ center }: { center: Position }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng])
  }, [center.lat, center.lng, map])
  return null
}

function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    const invalidate = () => map.invalidateSize()
    invalidate()
    const t1 = setTimeout(invalidate, 50)
    const t2 = setTimeout(invalidate, 300)
    const ro = new ResizeObserver(invalidate)
    ro.observe(map.getContainer())
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      ro.disconnect()
    }
  }, [map])
  return null
}

function ClickHandler({ onPick }: { onPick: (pos: Position) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

const OSMLocationPicker = (
  props: OSMLocationPickerProps,
): React.ReactElement => {
  const { value, onChange, defaultCenter, zoom = 13, className } = props
  const [center, setCenter] = useState<Position>(
    value ?? defaultCenter ?? DEFAULT_CENTER,
  )
  const [locating, setLocating] = useState<boolean>(!value)

  useEffect(() => {
    if (value || !locating) return
    if (!('geolocation' in navigator)) {
      setLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setCenter(next)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [value, locating])

  const marker = value ?? null

  return (
    <div
      className={className}
      style={{ position: 'relative', height: '100%', width: '100%' }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateOnMount />
        <RecenterMap center={center} />
        <ClickHandler
          onPick={(pos) => {
            setCenter(pos)
            onChange(pos)
          }}
        />
        {marker && (
          <Marker position={[marker.lat, marker.lng]} icon={markerIcon()} />
        )}
      </MapContainer>
      {locating && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            zIndex: 500,
          }}
        >
          Finding your location…
        </div>
      )}
    </div>
  )
}

export default OSMLocationPicker
