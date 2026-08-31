export type WardJoinRequestDto = {
  id: number
  userId: number
  userEmail: string
  wardId: number
  wardName: string
  status: string
  message?: string
  requestedAt: string
  assignedRole?: string
}
