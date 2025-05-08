import { notFound } from 'next/navigation'
import ShowHeader from '@/components/shows/ShowHeader'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface PageProps { params: { id: string } }

export default async function ShowPage({ params }: PageProps) {
  const supabase = createServerClient()

  const { data: show, error } = await supabase
    .from('shows')
    .select(
      `id, name, date, image_url, ticket_url,
       artist:artists(id,name),
       venue:venues(name,city,state)`
    )
    .eq('id', params.id)
    .single()

  if (error) {
    console.error('Error fetching show', error)
  }

  if (!show) {
    notFound()
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <ShowHeader show={show as any} />

      <main className="flex-grow container mx-auto px-4 py-12 text-white/80">
        {/* TODO: integrate SetlistSection for voting */}
        <p className="text-center text-lg">
          Voting UI coming soon.
        </p>
      </main>
    </div>
  )
} 