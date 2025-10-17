import * as React from 'react'
import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Member } from '@/type'
import { useState } from 'react'

type MarkerProps = {
  member: Member
  onSelect: (member: Member) => void
  colors?: string[]
}

const Marker: React.FC<MarkerProps> = (
  props: MarkerProps,
): React.ReactElement => {
  const [color, setColor] = useState<string>()
  const [background, setBackground] = useState<string>()
  const [bcolor, setBColor] = useState<string>()

  const onSelect = (member: Member): void => {
    if (props.colors) {
      setColor(props.colors[0])
      setBackground(props.colors[0])
      setBColor(props.colors[0])
    }
    props.onSelect(member)
  }
  return (
    <div>
      <AdvancedMarker
        position={{
          lat: props.member.lat as number,
          lng: props.member.lng as number,
        }}
        key={props.member.id}
        onClick={() => {
          onSelect(props.member)
        }}
      >
        <Pin
          background={background ?? '#0f9d58'}
          borderColor={bcolor ?? '#006425'}
          glyphColor={color ?? '#60d98f'}
        />
      </AdvancedMarker>
    </div>
  )
}

export default Marker
