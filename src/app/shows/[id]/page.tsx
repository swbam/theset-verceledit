import ShowHeader from '@/components/shows/ShowHeader'
import { createServerClient } from '@/lib/supabase/server'
import { Show } from '@/lib/types'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getShow(id: string): Promise<Show | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('shows')
    .select(
      `*, artists(id,name), venues(id,name,city,state)`
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching show', error)
    return null
  }
  return data as unknown as Show
}

export default async function ShowPage({ params }: { params: { id: string } }) {
  const show = await getShow(params.id)

  if (!show) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <ShowHeader show={show as any} />
    </div>
  )
} 