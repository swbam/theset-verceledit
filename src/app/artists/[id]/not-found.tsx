import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ArtistNotFound() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center py-20 px-4 md:px-6 text-center">
      <h1 className="text-4xl font-bold mb-4">Artist Not Found</h1>
      <p className="text-muted-foreground text-lg mb-8">
        We couldn't find the artist you're looking for. They might not be in our database yet.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="default">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Link>
        </Button>
        
        <Button asChild variant="outline">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Search For Artists
          </Link>
        </Button>
      </div>
    </div>
  );
} 