'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/artists', label: 'Artists' },
  { href: '/shows', label: 'Shows' },
  { href: '/import', label: 'Import' },
  { href: '/admin', label: 'Admin' }
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">TheSet</span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === href ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <ThemeToggle />
      </div>
    </header>
  )
} 