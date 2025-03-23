import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Supabase client with environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample data for artists (removed last_updated field)
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

// Sample data for upcoming shows
const generateShows = async (artistId, artistName) => {
  const venues = [
    { name: 'Madison Square Garden', city: 'New York, US' },
    { name: 'The O2', city: 'London, UK' },
    { name: 'Forum', city: 'Los Angeles, US' },
    { name: 'Scotiabank Arena', city: 'Toronto, CA' },
    { name: 'AccorHotels Arena', city: 'Paris, FR' }
  ];
  
  const shows = [];
  // Create 3 upcoming shows for each artist
  for (let i = 0; i < 3; i++) {
    const randomVenue = venues[Math.floor(Math.random() * venues.length)];
    // Future dates - 1 week, 2 weeks, 1 month
    const daysToAdd = [7, 14, 30][i];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    
    // First create or get venue
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .upsert({
        name: randomVenue.name,
        city: randomVenue.city.split(',')[0],
        state: randomVenue.city.includes('US') ? randomVenue.city.split(',')[1].trim() : null,
        country: randomVenue.city.split(',').pop().trim()
      })
      .select('id')
      .single();

    if (venueError) {
      console.error(`Error creating venue ${randomVenue.name}:`, venueError);
      continue;
    }

    // Create show with venue reference
    shows.push({
      artist_id: artistId,
      name: `${artistName} at ${randomVenue.name}`,
      venue_id: venueData.id,
      date: date.toISOString(),
      ticket_url: 'https://www.ticketmaster.com'
    });
  }
  
  return shows;
};

// Sample data for past setlists
const generateSetlists = async (artistId) => {
  const venues = [
    { name: 'Madison Square Garden', city: 'New York, US' },
    { name: 'The O2', city: 'London, UK' },
    { name: 'Forum', city: 'Los Angeles, US' },
    { name: 'Rogers Centre', city: 'Toronto, CA' },
    { name: 'Hyde Park', city: 'London, UK' }
  ];
  
  const setlists = [];
  // Create 5 past setlists for each artist
  for (let i = 0; i < 5; i++) {
    const randomVenue = venues[Math.floor(Math.random() * venues.length)];
    // Past dates - 1 month, 2 months, 3 months, 6 months, 1 year ago
    const daysToSubtract = [30, 60, 90, 180, 365][i];
    const date = new Date();
    date.setDate(date.getDate() - daysToSubtract);
    
    // First create or get venue
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .upsert({
        name: randomVenue.name,
        city: randomVenue.city.split(',')[0],
        state: randomVenue.city.includes('US') ? randomVenue.city.split(',')[1].trim() : null,
        country: randomVenue.city.split(',').pop().trim()
      })
      .select('id')
      .single();

    if (venueError) {
      console.error(`Error creating venue ${randomVenue.name}:`, venueError);
      continue;
    }

    setlists.push({
      artist_id: artistId,
      date: date.toISOString(),
      venue_id: venueData.id,
      tour_name: `${artistId === artists[0].name ? 'Eras Tour' : artistId === artists[4].name ? 'Music of the Spheres World Tour' : 'World Tour'} ${new Date().getFullYear()}`,
      setlist_fm_id: `${Date.now()}-${i}-${artistId}` // Generate a unique ID
    });
  }
  
  return setlists;
};

// Sample songs for each artist
const songsByArtist = {
  'Taylor Swift': [
    'Anti-Hero', 'Cruel Summer', 'Blank Space', 'Shake It Off', 'Love Story',
    'You Belong With Me', 'Cardigan', 'Wildest Dreams', 'Delicate', 'All Too Well',
    'Enchanted', 'August', 'Lavender Haze', 'The Man', 'Style'
  ],
  'The Weeknd': [
    'Blinding Lights', 'Starboy', 'The Hills', 'Save Your Tears', 'Often',
    'Heartless', 'Call Out My Name', 'Die For You', 'I Feel It Coming', 'In Your Eyes',
    'After Hours', 'Earned It', 'Moth To A Flame', 'Reminder', 'Party Monster'
  ],
  'Drake': [
    'God\'s Plan', 'Hotline Bling', 'One Dance', 'Started From the Bottom', 'In My Feelings',
    'Nice For What', 'Passionfruit', 'Laugh Now Cry Later', 'Hold On, We\'re Going Home', 'Money In The Grave',
    'Toosie Slide', 'Life Is Good', 'Wants and Needs', 'Knife Talk', 'Jimmy Cooks'
  ],
  'Billie Eilish': [
    'bad guy', 'Happier Than Ever', 'Therefore I Am', 'bury a friend', 'everything i wanted',
    'when the party\'s over', 'ocean eyes', 'NDA', 'Bellyache', 'Your Power',
    'my future', 'Lovely', 'Getting Older', 'Lost Cause', 'ilomilo'
  ],
  'Coldplay': [
    'Yellow', 'Viva La Vida', 'The Scientist', 'Fix You', 'Paradise',
    'Hymn for the Weekend', 'Something Just Like This', 'A Sky Full of Stars', 'Clocks', 'Adventure of a Lifetime',
    'Higher Power', 'My Universe', 'Don\'t Panic', 'Magic', 'In My Place'
  ]
};

// Main function to seed data
async function seedData() {
  try {
    console.log('Starting data seeding process...');
    
    // Use upsert for artists to handle existing records
    console.log('Upserting artists...');
    const { data: insertedArtists, error: artistError } = await supabase
      .from('artists')
      .upsert(artists, { onConflict: 'spotify_id' })
      .select();
      
    if (artistError) {
      console.error('Error upserting artists:', artistError);
      return;
    }
    
    console.log(`Successfully upserted ${insertedArtists.length} artists`);
    
    // Insert shows for each artist
    console.log('Inserting upcoming shows...');
    for (const artist of insertedArtists) {
      const shows = await generateShows(artist.id, artist.name);
      
      // Check if shows already exist for this artist
      const { data: existingShows } = await supabase
        .from('shows')
        .select('id')
        .eq('artist_id', artist.id);
        
      if (existingShows && existingShows.length > 0) {
        console.log(`Shows already exist for ${artist.name}, skipping...`);
        continue;
      }
      
      const { error: showsError } = await supabase
        .from('shows')
        .insert(shows)
        .select();
        
      if (showsError) {
        console.error(`Error inserting shows for ${artist.name}:`, showsError);
      } else {
        console.log(`Inserted shows for ${artist.name}`);
      }
    }
    
    // Insert setlists for each artist
    console.log('Inserting past setlists...');
    for (const artist of insertedArtists) {
      // Check if setlists already exist for this artist
      const { data: existingSetlists } = await supabase
        .from('setlists')
        .select('id')
        .eq('artist_id', artist.id);
        
      if (existingSetlists && existingSetlists.length > 0) {
        console.log(`Setlists already exist for ${artist.name}, skipping...`);
        continue;
      }
      
      const setlists = await generateSetlists(artist.id);
      const { data: insertedSetlists, error: setlistError } = await supabase
        .from('setlists')
        .insert(setlists)
        .select();
        
      if (setlistError) {
        console.error(`Error inserting setlists for ${artist.name}:`, setlistError);
        continue;
      }
      
      console.log(`Inserted ${insertedSetlists.length} setlists for ${artist.name}`);
      
      // Insert songs for each setlist
      console.log(`Inserting songs for ${artist.name}'s setlists...`);
      for (const setlist of insertedSetlists) {
        const artistSongs = songsByArtist[artist.name] || [];
        const shuffledSongs = [...artistSongs].sort(() => 0.5 - Math.random());
        const setlistSongs = shuffledSongs.slice(0, 10).map((name, index) => ({
          setlist_id: setlist.id,
          name: name,
          position: index + 1,
          artist_id: artist.id,
          vote_count: Math.floor(Math.random() * 100) // Random vote count
        }));
        
        const { error: songsError } = await supabase
          .from('setlist_songs')
          .insert(setlistSongs)
          .select();
          
        if (songsError) {
          console.error(`Error inserting songs for setlist ${setlist.id}:`, songsError);
        } else {
          console.log(`Inserted ${setlistSongs.length} songs for setlist at ${setlist.venue} on ${new Date(setlist.date).toLocaleDateString()}`);
        }
      }
    }
    
    console.log('Data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Run the seeding function
seedData().catch(console.error);
