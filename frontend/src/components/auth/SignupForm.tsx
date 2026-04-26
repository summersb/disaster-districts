import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup, login } from '@/hooks/useLogin.tsx'
import UserContext from '@/context/UserContext'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useContext } from 'react'
import * as z from 'zod'

// ✅ Define schema with password verification
const formSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function SignupForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const navigate = useNavigate()
  const userContext = useContext(UserContext)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signup(values)
      const authResponse = await login({ email: values.email, password: values.password })
      if (userContext) {
        userContext.setUser({
          id: authResponse.id,
          email: authResponse.email,
          token: authResponse.token,
          wardId: authResponse.wardId,
          roles: authResponse.roles,
        })
        window.localStorage.setItem('user', JSON.stringify({
          id: authResponse.id,
          email: authResponse.email,
          token: authResponse.token,
          wardId: authResponse.wardId,
          roles: authResponse.roles,
        }))
      }
      navigate({ to: '/_protected/join-ward' }).catch((error) => console.error(error))
      return
    } catch (err: any) {
      console.error('Signup failed', err)
      form.setError('email', { message: err.message || 'Signup failed' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign up</CardTitle>
          <CardDescription className="text-center">
            Create an account
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label>Email</Label>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
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
                    <Label>Password</Label>
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label>Confirm Password</Label>
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
                Sign up
              </Button>

              <p className="text-sm text-gray-400 mt-4 text-center">
                Already have an account?{' '}
                <a href="/login" className="text-blue-400 hover:underline">
                  Log in
                </a>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
