import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <section className="text-center max-w-4xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Discover and Vote on Songs for Upcoming Concerts</h1>
        <p className="text-xl text-muted-foreground mb-8">
          TheSet helps you influence what artists play at their next show. Browse upcoming concerts, vote on songs, 
          and see what others want to hear.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/artists">Browse Artists</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/import">Import Artist</Link>
          </Button>
        </div>
      </section>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-3">Find Shows</h2>
          <p className="text-muted-foreground mb-4">Discover upcoming concerts from your favorite artists in your area.</p>
          <Button asChild variant="link" className="px-0">
            <Link href="/shows">View Upcoming Shows</Link>
          </Button>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-3">Vote on Songs</h2>
          <p className="text-muted-foreground mb-4">Cast your vote for the songs you want to hear at the next concert.</p>
          <Button asChild variant="link" className="px-0">
            <Link href="/artists">Browse Artists to Vote</Link>
          </Button>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-3">Get Setlist Predictions</h2>
          <p className="text-muted-foreground mb-4">See community-driven predictions for upcoming show setlists.</p>
          <Button asChild variant="link" className="px-0">
            <Link href="/shows">View Setlist Predictions</Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 