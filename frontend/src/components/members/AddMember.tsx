import type React from 'react'
import MemberForm from './MemberForm'

const AddMember = (): React.ReactElement => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Add Member</h1>
      <MemberForm />
    </div>
  )
}

export default AddMember
