import { WardConfig } from '@/type/Ward.ts'

export const getPerms = () => {
  return
}
export const loadDefaultWard = async (uid: string): Promise<WardConfig> => {
  const response = await fetch('/api/wards')
  const json = await response.json()
  return json[0].name

  // const docRef = doc(db, `users`, uid)
  // const userConfig = await getDoc(docRef)
  // if (userConfig.exists()) {
  //   return userConfig.data().wardConfig
  // }
  // return { wardName: '' }
}

export const getWardList = async (): Promise<WardConfig[]> => {
  const response = await fetch('/api/wards')
  const json = await response.json()
  return json.map(w => w.name)

  // const docRef = doc(db, `${topCollection}`, 'wardList')
  // const wardList = await getDoc(docRef)
  // if (wardList.exists()) {
  //   const wardDoc = wardList.data() as WardDoc
  //   return wardDoc.list
  // }
  // return []
}

// export const saveWardList = async (wardList: WardConfig[]): Promise<void> => {
//   const docRef = doc(db, `${topCollection}`, 'wardList')
//   const wardDoc = { list: wardList } as WardDoc
//   await setDoc(docRef, wardDoc)
// }
//
// export const getPerms = async (): Promise<UserRoles> => {
//   const wardName = getActiveWard().wardName
//   const unit1Ref = doc(db, `${topCollection}`, wardName)
//   const permDoc = await getDoc(unit1Ref)
//   return permDoc.data() as UserRoles
// }

// export const savePermissions = async (
//   wardName: string,
//   data: UserRoles,
// ): Promise<void> => {
//   const wardDoc = doc(db, `${topCollection}`, wardName)
//   setDoc(wardDoc, data)
// }

export const createWard = async (name: string, user: UserType): Promise<void> => {
  const response = await fetch('/api/ward', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    body: JSON.stringify({"name":name})
  })

  // await setDoc(doc(db, `${topCollection}`, id), {
  //   createdBy: user.name,
  //   users: {
  //     [user.uid as string]: {
  //       role: 'editor',
  //       name: user.name as string,
  //     },
  //   },
  //   createdAt: new Date(),
  // })
  //
  // await setDoc(
  //   doc(collection(db, topCollection, id, 'members'), 'member_list'),
  //   {},
  // )
  // await setDoc(
  //   doc(collection(db, topCollection, id, 'districts'), 'district_list'),
  //   {},
  // )
}
