import type { DistrictDbType } from '@/type'

export const getDistrictList = async (): Promise<DistrictDbType[]> => {
  return []
}
export const getDistrictMap = async () => {
  return
}

export const saveDistrictList = async (
  district: DistrictDbType[],
): Promise<void> => {
  // const map = toMap(district)
  // return saveDistrictMap(map)
}

export const saveDistrictMap = async (
  district: Map<string, DistrictDbType>,
): Promise<void> => {
  // const wardDoc = getActiveWard().wardName
  // const cleanDistrictMap = filterNullUndefined(district)
  // const holderObject: {
  //   [key: string]: Partial<Member>
  // } = Object.fromEntries(Array.from(cleanDistrictMap.entries()))
  // const wardCollection = collection(db, `${topCollection}/${wardDoc}/districts`)
  // await setDoc(doc(wardCollection, districtListDocName), holderObject)
}

//export const getDistrictList = async (): Promise<DistrictDbType[]> => {
  // const map = await getDistrictMap()
  // return toList(map)
//}

//export const getDistrictMap = async (): Promise<
//  Map<string, DistrictDbType>
//> => {
  // const wardDoc = getActiveWard().wardName
  // try {
  //   const docRef = doc(
  //     db,
  //     `${topCollection}/${wardDoc}/districts`,
  //     districtListDocName,
  //   )
  //   const districtSnap = await getDoc(docRef)
  //   if (districtSnap.exists()) {
  //     const map: { [key: string]: DistrictDbType } = districtSnap.data()
  //     return new Map(Object.entries(map))
  //   } else {
  //     return new Map()
  //   }
  // } catch (error) {
  //   console.log('error', `${error}`)
  //   throw error
  // }
//}

export const saveDistrict = async (district: DistrictDbType): Promise<void> => {
  // const map = await getDistrictMap()
  // map.set(district.id, district)
  // return saveDistrictMap(map)
}

export const getDistrict = async (id: string): Promise<DistrictDbType> => {
  const response = await fetch(`/api/district/${id}`)
  const json = await response.json()
  return json
  // const map = await getDistrictMap()
  // return map.get(id) as DistrictDbType
}

export const deleteDistrict = async (id: string): Promise<void> => {
  await fetch(`/api/district/${id}`,{
    method: 'DELETE'
  })
  // const map = await getDistrictMap()
  // map.delete(id)
  // return saveDistrictMap(map)
}
