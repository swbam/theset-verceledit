'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);
  const supabase = createClientComponentClient();

  // Function to seed artists
  async function seedArtists() {
    setLoading(true);
    setStatus(null);
    
    try {
      const artists = [
        {
          name: 'Taylor Swift',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb6a224073987b930f99adc8bc',
          spotify_id: '06HL4z0CvFAxyc27GXpf02',
          followers: 92500000,
          popularity: 100,
          genres: ['pop', 'dance pop', 'pop dance']
        },
        {
          name: 'The Weeknd',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
          spotify_id: '1Xyo4u8uXC1ZmMpatF05PJ',
          followers: 75300000,
          popularity: 96,
          genres: ['canadian contemporary r&b', 'canadian pop', 'pop']
        },
        {
          name: 'Drake',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
          spotify_id: '3TVXtAsR1Inumwj472S9r4',
          followers: 73000000,
          popularity: 95,
          genres: ['canadian hip hop', 'canadian pop', 'hip hop', 'rap', 'toronto rap']
        },
        {
          name: 'Billie Eilish',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb7b9745078c6a3d3ccafebbe5',
          spotify_id: '6qqNVTkY8uBg9cP3Jd7DAH',
          followers: 61400000,
          popularity: 90,
          genres: ['pop', 'electropop']
        },
        {
          name: 'Coldplay',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb989ed05e1f0570cc4726c2d3',
          spotify_id: '4gzpq5DPGxSnKTe4SA8HAU',
          followers: 43200000,
          popularity: 89,
          genres: ['permanent wave', 'pop', 'pop rock', 'rock']
        }
      ];
      
      const { data, error } = await supabase.from('artists').insert(artists).select();
      
      if (error) throw error;
      
      setStatus({
        message: `Successfully added ${data.length} artists.`,
        success: true
      });
    } catch (error: any) {
      console.error('Error seeding artists:', error);
      setStatus({
        message: `Error: ${error.message || 'Failed to seed artists'}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Function to seed shows for an artist
  async function seedShows() {
    setLoading(true);
    setStatus(null);
    
    try {
      // First get artists
      const { data: artists, error: artistsError } = await supabase.from('artists').select('id, name');
      
      if (artistsError) throw artistsError;
      if (!artists || artists.length === 0) throw new Error('No artists found. Seed artists first.');
      
      const venues = [
        { name: 'Madison Square Garden', city: 'New York, US' },
        { name: 'The O2', city: 'London, UK' },
        { name: 'Forum', city: 'Los Angeles, US' },
        { name: 'Scotiabank Arena', city: 'Toronto, CA' },
        { name: 'AccorHotels Arena', city: 'Paris, FR' }
      ];
      
      let totalShows = 0;
      
      // For each artist, create 3 shows
      for (const artist of artists) {
        const shows = [];
        
        for (let i = 0; i < 3; i++) {
          const randomVenue = venues[Math.floor(Math.random() * venues.length)];
          const daysToAdd = [7, 14, 30][i];
          const date = new Date();
          date.setDate(date.getDate() + daysToAdd);
          
          shows.push({
            artist_id: artist.id,
            date: date.toISOString(),
            venue: randomVenue.name,
            city: randomVenue.city,
            ticket_url: 'https://www.ticketmaster.com'
          });
        }
        
        const { data, error } = await supabase.from('shows').insert(shows);
        
        if (error) throw error;
        totalShows += shows.length;
      }
      
      setStatus({
        message: `Successfully added ${totalShows} shows for ${artists.length} artists.`,
        success: true
      });
    } catch (error: any) {
      console.error('Error seeding shows:', error);
      setStatus({
        message: `Error: ${error.message || 'Failed to seed shows'}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Function to seed setlists and songs
  async function seedSetlists() {
    setLoading(true);
    setStatus(null);
    
    try {
      // First get artists
      const { data: artists, error: artistsError } = await supabase.from('artists').select('id, name');
      
      if (artistsError) throw artistsError;
      if (!artists || artists.length === 0) throw new Error('No artists found. Seed artists first.');
      
      const venues = [
        { name: 'Madison Square Garden', city: 'New York, US' },
        { name: 'The O2', city: 'London, UK' },
        { name: 'Forum', city: 'Los Angeles, US' },
        { name: 'Rogers Centre', city: 'Toronto, CA' },
        { name: 'Hyde Park', city: 'London, UK' }
      ];
      
      const songsByArtist: Record<string, string[]> = {
        'Taylor Swift': [
          'Anti-Hero', 'Cruel Summer', 'Blank Space', 'Shake It Off', 'Love Story',
          'You Belong With Me', 'Cardigan', 'Wildest Dreams', 'Delicate', 'All Too Well'
        ],
        'The Weeknd': [
          'Blinding Lights', 'Starboy', 'The Hills', 'Save Your Tears', 'Often',
          'Heartless', 'Call Out My Name', 'Die For You', 'I Feel It Coming', 'In Your Eyes'
        ],
        'Drake': [
          'God\'s Plan', 'Hotline Bling', 'One Dance', 'Started From the Bottom', 'In My Feelings',
          'Nice For What', 'Passionfruit', 'Laugh Now Cry Later', 'Hold On, We\'re Going Home', 'Money In The Grave'
        ],
        'Billie Eilish': [
          'bad guy', 'Happier Than Ever', 'Therefore I Am', 'bury a friend', 'everything i wanted',
          'when the party\'s over', 'ocean eyes', 'NDA', 'Bellyache', 'Your Power'
        ],
        'Coldplay': [
          'Yellow', 'Viva La Vida', 'The Scientist', 'Fix You', 'Paradise',
          'Hymn for the Weekend', 'Something Just Like This', 'A Sky Full of Stars', 'Clocks', 'Adventure of a Lifetime'
        ]
      };
      
      let totalSetlists = 0;
      let totalSongs = 0;
      
      // For each artist, create past setlists and songs
      for (const artist of artists) {
        // Create 3 setlists per artist
        const setlists = [];
        
        for (let i = 0; i < 3; i++) {
          const randomVenue = venues[Math.floor(Math.random() * venues.length)];
          const daysToSubtract = [60, 120, 180][i]; // Past dates
          const date = new Date();
          date.setDate(date.getDate() - daysToSubtract);
          
          setlists.push({
            artist_id: artist.id,
            date: date.toISOString(),
            venue: randomVenue.name,
            venue_city: randomVenue.city,
            tour_name: `${artist.name} Tour ${new Date().getFullYear() - 1}`,
            setlist_fm_id: `seed-${Date.now()}-${i}-${artist.id}`
          });
        }
        
        const { data: insertedSetlists, error: setlistError } = await supabase
          .from('setlists')
          .insert(setlists)
          .select();
        
        if (setlistError) throw setlistError;
        totalSetlists += insertedSetlists.length;
        
        // Add songs to each setlist
        for (const setlist of insertedSetlists) {
          const artistSongs = songsByArtist[artist.name] || ['Song 1', 'Song 2', 'Song 3', 'Song 4', 'Song 5'];
          const shuffledSongs = [...artistSongs].sort(() => 0.5 - Math.random());
          
          const setlistSongs = shuffledSongs.slice(0, 10).map((name, index) => ({
            setlist_id: setlist.id,
            name: name,
            position: index + 1,
            artist_id: artist.id,
            vote_count: Math.floor(Math.random() * 100) // Random vote count
          }));
          
          const { error: songsError } = await supabase.from('setlist_songs').insert(setlistSongs);
          
          if (songsError) throw songsError;
          totalSongs += setlistSongs.length;
        }
      }
      
      setStatus({
        message: `Successfully added ${totalSetlists} setlists and ${totalSongs} songs.`,
        success: true
      });
    } catch (error: any) {
      console.error('Error seeding setlists:', error);
      setStatus({
        message: `Error: ${error.message || 'Failed to seed setlists and songs'}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {status && (
        <Alert className={status.success ? "bg-green-100 text-green-800 mb-6" : "bg-red-100 text-red-800 mb-6"}>
          <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Seed Artists</CardTitle>
            <CardDescription>Add sample artists to the database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              This will add 5 popular artists to the database with information like popularity, followers, genres, etc.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={seedArtists} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Seed Artists'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Seed Shows</CardTitle>
            <CardDescription>Add upcoming shows for artists</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              This will create future shows for all artists in the database at popular venues.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={seedShows} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Seed Shows'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Seed Setlists & Songs</CardTitle>
            <CardDescription>Add past setlists with songs for artists</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              This will create past setlists for all artists, including popular songs with random vote counts.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={seedSetlists} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Seed Setlists & Songs'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Separator className="my-8" />
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
            <CardDescription>Current record counts in the database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Visit this page to manually seed data in your Supabase database. The buttons above will add sample data for testing purposes.
            </p>
            <p className="text-sm mt-4">
              After seeding the data, you can explore the app to see artists, shows, and setlists with songs that users can vote on.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 