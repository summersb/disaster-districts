import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import UserContext from '@/context/UserContext'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useState, useContext } from 'react'
import type { WardDto } from '@/type'

const JoinWardPage: React.FC = () => {
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const userContext = useContext(UserContext)
  const user = userContext?.user ?? {}

  const { data: wards, isLoading, error: wardsError } = useQuery({
    queryKey: ['wards'],
    queryFn: async () => {
      const res = await fetch('/api/wards')
      if (!res.ok) throw new Error('Failed to fetch wards')
      return (await res.json()) as WardDto[]
    },
  })

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWardId) throw new Error('Ward not selected')
      if (!user?.id) throw new Error('User not authenticated')
      const res = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, wardId: selectedWardId, message: message || null }),
      })
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('You already have a pending request')
        }
        throw new Error('Failed to create request')
      }
      return res.json()
    },
    onSuccess: () => {
      navigate({ to: '/join-ward-confirmation' })
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">Loading wards...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join a Ward</CardTitle>
          <CardDescription>
            Select a ward to request membership. A ward administrator will review your request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wardsError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              Failed to load wards. Please try again.
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select a Ward</label>
            <div className="space-y-2">
              {!wards || wards.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No wards available</div>
              ) : (
                wards.map((ward) => (
                <button
                  key={ward.id}
                  onClick={() => setSelectedWardId(ward.id ?? null)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedWardId === ward.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{ward.name}</div>
                </button>
              ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="block text-sm font-medium">
              Message (optional)
            </label>
            <Textarea
              id="message"
              placeholder="Tell the ward administrator why you'd like to join..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {createRequestMutation.error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {createRequestMutation.error.message}
            </div>
          )}

          <Button
            onClick={() => createRequestMutation.mutate()}
            disabled={!selectedWardId || createRequestMutation.isPending}
            className="w-full"
          >
            {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default JoinWardPage
