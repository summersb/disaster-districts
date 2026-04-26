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
import { googleLogin, login } from '@/hooks/useLogin.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { Route as SignupRoute } from '@/routes/signup'
import { type LoginRequest, LoginSchema } from '@/type/User.ts'
import { zodResolver } from '@hookform/resolvers/zod'
import { GoogleLogin } from '@react-oauth/google'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function LoginForm() {
  const [error, setError] = useState<string>()
  const navigate = useNavigate()
  const [, setUser] = useLocalStorageState<User>('user', undefined)
  const search = useSearch({ from: '/login/' })
  const auth = useUser()
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleAuthSuccess = async (json: { token: string; id?: number; email: string; roles?: string[]; wardId?: number }) => {
    auth.setUser({ id: json.id, email: json.email, token: json.token, roles: json.roles, wardId: json.wardId })
    setUser({ id: json.id, email: json.email, token: json.token, roles: json.roles, wardId: json.wardId })
    const from = search.from || DashboardRoute.to
    await navigate({ to: from, replace: true })
  }

  const onSubmit = async (values: LoginRequest) => {
    try {
      const json = await login(values)
      await handleAuthSuccess(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const onGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      if (!credentialResponse.credential) throw new Error('No credential returned')
      const json = await googleLogin(credentialResponse.credential)
      await handleAuthSuccess(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
    }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
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
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full">
                Sign In
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
                      onError={() => setError('Google login failed')}
                      useOneTap={false}
                    />
                  </div>
                </>
              )}
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to={SignupRoute.to}
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
