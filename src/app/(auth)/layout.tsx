import { Inter } from 'next/font/google'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

const inter = Inter({ 
  variable: '--font-inter',
  display: 'swap'
})

export const metadata = {
  title: 'Authentication - TheSet',
  description: 'Sign in to access TheSet admin features',
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className={inter.className}>
      {children}
    </div>
  )
} 