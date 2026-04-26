import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx'
import { Input } from '@/components/ui/input.tsx'
import type { User } from '@/context/UserContext.tsx'
import useUser from '@/context/useUser.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { setupAdmin } from '@/hooks/useLogin.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { invalidateSetupCache } from '@/routes/__root'
import { zodResolver } from '@hookform/resolvers/zod'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const SetupSchema = z
  .object({
    email: z.email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SetupRequest = z.infer<typeof SetupSchema>

export function SetupForm() {
  const [error, setError] = useState<string>()
  const navigate = useNavigate()
  const [, setStoredUser] = useLocalStorageState<User>('user', undefined)
  const auth = useUser()
  const form = useForm<SetupRequest>({
    resolver: zodResolver(SetupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const handleAuthSuccess = async (json: { token: string; id?: number; email: string; roles?: string[]; wardId?: number }) => {
    auth.setUser({ id: json.id, email: json.email, token: json.token, roles: json.roles, wardId: json.wardId })
    setStoredUser({ id: json.id, email: json.email, token: json.token, roles: json.roles, wardId: json.wardId })
    invalidateSetupCache()
    await navigate({ to: DashboardRoute.to, replace: true })
  }

  const onSubmit = async (values: SetupRequest) => {
    try {
      const json = await setupAdmin({ email: values.email, password: values.password })
      await handleAuthSuccess(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    }
  }

  const onGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      if (!credentialResponse.credential) throw new Error('No credential returned')
      const json = await setupAdmin({ credential: credentialResponse.credential })
      await handleAuthSuccess(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google setup failed')
    }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Admin Account</CardTitle>
          <CardDescription className="text-center">
            No accounts exist yet. Set up the administrator account to get started.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full">
                Create Admin Account
              </Button>
              {googleClientId && (
                <>
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <div className="flex justify-center w-full">
                    <GoogleLogin
                      onSuccess={onGoogleSuccess}
                      onError={() => setError('Google setup failed')}
                      useOneTap={false}
                    />
                  </div>
                </>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
