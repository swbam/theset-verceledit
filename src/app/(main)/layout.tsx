import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Providers } from '../providers'
import { MainNav } from '@/components/layout/MainNav'
import { Footer } from '@/components/layout/Footer'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Providers>
        <div className="min-h-screen bg-background">
          <MainNav />
          <main className="container mx-auto px-4 py-8">
            <Suspense fallback={<div>Loading...</div>}>
              {children}
            </Suspense>
          </main>
          <Footer />
        </div>
      </Providers>
    </ErrorBoundary>
  )
} 