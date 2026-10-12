import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function JoinWardConfirmationPage(): React.ReactElement {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request Submitted</CardTitle>
          <CardDescription>
            Your ward join request has been submitted for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A ward administrator will review your request and get back to you
            soon. You'll be able to access the application once your request is
            approved.
          </p>
          <Button onClick={() => navigate({ to: '/login' })} className="w-full">
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/join-ward-confirmation/')({
  component: JoinWardConfirmationPage,
})
