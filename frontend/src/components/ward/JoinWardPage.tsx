import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useUser from '@/context/useUser.tsx'
import { useWards } from '@/hooks/useWards'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard/index'

const JoinWardPage = (): React.ReactElement => {
  const navigate = useNavigate()
  const { user } = useUser()
  const { data: wards = [], isLoading: wardsLoading } = useWards()
  const [wardId, setWardId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, wardId: Number(wardId) }),
      })
      if (!res.ok) throw new Error('Failed to join ward')
      await navigate({ to: DashboardRoute.to })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Join a Ward</h1>
        <form onSubmit={handleJoin} className="space-y-4">
          <Select value={wardId} onValueChange={setWardId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  wardsLoading ? 'Loading wards...' : 'Select a ward'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {wards.map((ward) => (
                <SelectItem key={ward.id} value={String(ward.id)}>
                  {ward.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-red-500">{error}</p>}
          <Button
            type="submit"
            disabled={loading || !wardId}
            className="w-full"
          >
            {loading ? 'Joining...' : 'Join Ward'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default JoinWardPage
