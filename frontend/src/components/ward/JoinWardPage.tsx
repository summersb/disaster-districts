import { useState } from 'react'
import type React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard/index'

const JoinWardPage = (): React.ReactElement => {
  const navigate = useNavigate()
  const [wardId, setWardId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ward-join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: Number(wardId) }),
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
          <Input
            type="number"
            placeholder="Ward ID"
            value={wardId}
            onChange={(e) => setWardId(e.target.value)}
            required
          />
          {error && <p className="text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Joining...' : 'Join Ward'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default JoinWardPage
