import SearchClient from './SearchClient'

export const dynamic = 'force-static'

export default function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SearchClient />
    </div>
  )
} 