import Marker from '@/pages/map/Marker.tsx'
import type { Member } from '@/type'

type Props = { members: Member[]; onSelect: (member: Member) => void }

export default function Markers({ members, onSelect }: Props) {
  return (
    <div>
      {members
        .filter((m) => m.lat !== undefined && m.lng !== undefined)
        .map((member) => (
          <Marker key={member.id} member={member} onSelect={onSelect} />
        ))}
    </div>
  )
}
