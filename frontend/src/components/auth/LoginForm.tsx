import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form.tsx'
import useUser from '@/context/useUser.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { User } from '@/context/UserContext.tsx'
import { Route as SignupRoute } from '@/routes/signup'
import { login } from '@/hooks/useLogin.tsx'
import { LoginRequest, LoginSchema } from '@/type/User.ts'
import { useState } from 'react'

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

  const onSubmit = async (values: LoginRequest) => {
    console.log('Login attempt:', values)
    try {
      const json = await login(values)
      console.log(json)
      auth.setUser({ id: json.id, email: json.email })
      setUser({ email: json.email })
      const from = search.from || DashboardRoute.to
      // Use router.navigate instead of setTimeout to ensure proper routing
      console.log('login form navigate to ', from)
      await navigate({ to: from, replace: true })
    } catch (error) {
      console.log(error)
      setError(error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      {error && (<>Error logging in</>)}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
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
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full">
                Sign In
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Don’t have an account?{' '}
                <Link to={SignupRoute.to} className="text-primary hover:underline">
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
