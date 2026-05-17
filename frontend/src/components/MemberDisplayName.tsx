import type React from 'react'
import type { MemberDto } from '@/type'

type MemberDisplayNameProps = {
  member?: MemberDto
}

const MemberDisplayName = (
  props: MemberDisplayNameProps,
): React.ReactElement => {
  const name = `${props?.member?.familyName ?? ''}`
  const f = props?.member?.name ? `, ${props.member.name}` : ''
  return (
    <span>
      {name}
      {f}
    </span>
  )
}

export default MemberDisplayName
