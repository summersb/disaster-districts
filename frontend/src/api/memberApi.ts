import type { Member } from '@/type'

export const getMemberMap = () => {
  return
}
export const saveMemberMap = async (member: Member): Promise<void> => {
  return
}

export const saveMemberList = async (
  members: Member[],
  wardId?: number,
): Promise<void> => {
  members.forEach(async (member) => {
    saveMember(wardId, member)
  })

  // const map = toMap(members)
  // if (wardName == null) {
  //   wardName = getActiveWard().wardName
  // }
  // return saveMemberMap(wardName, map)
}

// export const saveMemberMap = async (
//   wardName: string,
//   members: Map<string, Partial<Member>>,
// ): Promise<void> => {
//   const cleanMemberMap = filterNullUndefined(members)
//   const holderObject: {
//     [key: string]: Partial<Member>
//   } = Object.fromEntries(Array.from(cleanMemberMap.entries()))
//   const wardCollection = collection(db, `${topCollection}/${wardName}/members`)
//   await setDoc(doc(wardCollection, memberListDocName), holderObject)
// }

export const getMemberList = async (id: number): Promise<Member[]> => {
  const response = await fetch('/api/ward/$id/members')
  const json = await response.json()
  return json
  // const map = await getMemberMap()
  // return toList(map)
}

// export const getMemberMap = async (): Promise<Map<string, Member>> => {
//   const wardDoc = getActiveWard().wardName
//   const docRef = doc(
//     db,
//     `${topCollection}/${wardDoc}/members`,
//     memberListDocName,
//   )
//   const memberListSnap = await getDoc(docRef)
//   if (memberListSnap.exists()) {
//     const map: { [key: string]: Member } = memberListSnap.data()
//     return new Map(Object.entries(map))
//   } else {
//     return new Map()
//   }
// }

export const saveMember = async (wardId: number, member: Partial<Member>): Promise<void> => {
  await fetch(`/api/ward/${wardId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(member),
  })
  // const map = await getMemberMap()
  // const wardDoc = getActiveWard().wardName
  // map.set(member.id as string, member as Member)
  // return saveMemberMap(wardDoc, map)
}

export const getMember = async (id: string): Promise<Member> => {
  const response = await fetch(`/api/member/${id}`)
  const json = await response.json()
  return json
  // const map = await getMemberMap()
  // return map.get(id) as Member
}

export const deleteMember = async (id: string): Promise<void> => {
  await fetch(`/api/member/${id}`, {
    method: 'DELETE',
  })
  // const wardDoc = getActiveWard().wardName
  // const map = await getMemberMap()
  // map.delete(id)
  // return saveMemberMap(wardDoc, map)
}
