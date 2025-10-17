import { WardConfig } from '@/type/Ward.ts'

export const getActiveWard = (): WardConfig => {
  return JSON.parse(localStorage.getItem('ward') ?? '{}')
}

export const saveActiveWard = async (ward: WardConfig): Promise<void> => {
  localStorage.setItem('ward', JSON.stringify(ward))
}
