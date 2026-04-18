import type { Ward } from '@/type/Ward.ts'

export const getActiveWard = (): Ward | undefined => {
  try {
    const raw = localStorage.getItem('ward')
    if (!raw) return undefined
    return JSON.parse(raw) as Ward
  } catch (_e) {
    return undefined
  }
}

export const saveActiveWard = async (ward: Ward): Promise<void> => {
  localStorage.setItem('ward', JSON.stringify(ward))
}
