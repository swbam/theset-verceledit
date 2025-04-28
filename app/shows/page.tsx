import { createClient } from '@/utils/supabase/server';
import { Show } from '@/types/show';
import { formatDate } from '@/lib/utils/date';
import ShowCard from '@/components/ShowCard';

export default async function Shows() {
  const supabase = createClient();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .order('date', { ascending: true });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Upcoming Shows</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shows?.map((show: Show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
} 