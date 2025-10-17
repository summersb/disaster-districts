import { useState, useEffect } from 'react'

export const useLocalStorageState = <T,>(
  key: string,
  defaultValue: T | undefined,
): [T | undefined, (newValue: T | undefined) => void] => {
  const [value, setValue] = useState<T | undefined>(() => {
    const storedValue = localStorage.getItem(key)
    return storedValue ? (JSON.parse(storedValue) as T) : defaultValue
  })

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      if ('key' in event && event.key === key && event.newValue !== null) {
        setValue(JSON.parse(event.newValue) as T)
      } else if ('detail' in event && event.detail.key === key) {
        setValue(JSON.parse(event.detail.newValue as string) as T)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(
      'local-storage',
      handleStorageChange as EventListener,
    )
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.addEventListener(
        'local-storage',
        handleStorageChange as EventListener,
      )
    }
  }, [key])

  const setStoredValue = (newValue: T | undefined) => {
    setValue(newValue)
    localStorage.setItem(key, JSON.stringify(newValue))
    window.dispatchEvent(
      new CustomEvent('local-storage', {
        detail: { key, newValue: JSON.stringify(newValue) },
      }),
    )
  }

  return [value, setStoredValue]
}
