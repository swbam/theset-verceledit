
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MapPin, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock data to match the design
const GENRES = [
  { id: "all", name: "All Genres" },
  { id: "pop", name: "Pop" },
  { id: "rock", name: "Rock" },
  { id: "hip-hop", name: "Hip-Hop" },
  { id: "electronic", name: "Electronic" },
  { id: "r&b", name: "R&B" },
  { id: "country", name: "Country" },
  { id: "latin", name: "Latin" }
];

const MOCK_SHOWS = [
  {
    id: "show1",
    name: "The Eras Tour",
    artist: { name: "Taylor Swift" },
    date: "May 15, 2023",
    venue: { name: "MetLife Stadium", city: "East Rutherford", state: "NJ" },
    genres: ["Pop"],
    image_url: "https://media.pitchfork.com/photos/61d4ca4cef233215262a2e2b/master/w_1600,c_limit/taylor-swift-bb13-2021-billboard-1548.jpg"
  },
  {
    id: "show2",
    name: "Hit Me Hard and Soft Tour",
    artist: { name: "Billie Eilish" },
    date: "May 31, 2023",
    venue: { name: "Chicago United Center", city: "Chicago", state: "IL" },
    genres: ["Pop", "Alternative"],
    image_url: "https://www.billboard.com/wp-content/uploads/2023/06/Billie-Eilish-press-2023-cr-Mason-Poole-billboard-1548.jpg"
  },
  {
    id: "show3",
    name: "Music Of The Spheres Tour",
    artist: { name: "Coldplay" },
    date: "May 28, 2023",
    venue: { name: "Sofi Stadium", city: "Inglewood", state: "CA" },
    genres: ["Rock", "Alternative"],
    image_url: "https://footprintuscoalition.com/wp-content/uploads/2023/05/pasted-image-0-2.png"
  },
  {
    id: "show4",
    name: "Radical Optimism Tour",
    artist: { name: "Dua Lipa" },
    date: "June 14, 2023",
    venue: { name: "Madison Square Garden", city: "New York", state: "NY" },
    genres: ["Pop", "Dance"],
    image_url: "https://www.billboard.com/wp-content/uploads/2023/05/Dua-Lipa-cr-Tyrone-Lebon-bb05-2023-billboard-1548.jpg"
  },
  {
    id: "show5",
    name: "Renaissance World Tour",
    artist: { name: "Beyoncé" },
    date: "July 8, 2023",
    venue: { name: "Mercedes-Benz Stadium", city: "Atlanta", state: "GA" },
    genres: ["R&B", "Pop"],
    image_url: "https://www.rollingstone.com/wp-content/uploads/2022/07/Beyonce-RENAISSANCE-album.jpg"
  },
  {
    id: "show6",
    name: "Everything or Nothing At All Tour",
    artist: { name: "Sabrina Carpenter" },
    date: "Oct. 20, 2023",
    venue: { name: "Kia Forum", city: "Los Angeles", state: "CA" },
    genres: ["Pop"],
    image_url: "https://media.newyorker.com/photos/660c47ad3744c2a0df96c066/master/w_2560%2Cc_limit/Hajdu-Sabrina-Carpenter-Short-n-Sweet.jpg"
  },
  {
    id: "show7",
    name: "Utopia Tour",
    artist: { name: "Travis Scott" },
    date: "October 11, 2023",
    venue: { name: "Crypto.com Arena", city: "Los Angeles", state: "CA" },
    genres: ["Hip-Hop"],
    image_url: "https://www.billboard.com/wp-content/uploads/2023/02/travis-scott-perform-2022-billboard-1548.jpg"
  },
  {
    id: "show8",
    name: "It's All A Blur Tour",
    artist: { name: "Drake" },
    date: "June 16, 2023",
    venue: { name: "State Farm Arena", city: "Atlanta", state: "GA" },
    genres: ["Hip-Hop"],
    image_url: "https://media.pitchfork.com/photos/5c7d4c1b4101df3df85c41e5/master/w_1600%2Cc_limit/Drake.jpg"
  }
];

const UpcomingShows = () => {
  const [activeGenre, setActiveGenre] = useState("all");
  
  // Filter shows by selected genre
  const filteredShows = MOCK_SHOWS.filter(show => 
    activeGenre === "all" || show.genres.some(g => g.toLowerCase() === activeGenre.toLowerCase())
  );

  return (
    <section className="py-12 md:py-16 px-4 bg-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-sm md:text-base text-white/70 mt-1">
              Popular concerts coming up soon
            </p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {GENRES.map(genre => (
            <button
              key={genre.id}
              onClick={() => setActiveGenre(genre.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                activeGenre === genre.id
                  ? 'bg-white text-black font-medium'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredShows.map(show => (
            <Card key={show.id} className="bg-black/40 border-white/10 overflow-hidden hover:border-white/20 transition-all">
              <Link to={`/shows/${show.id}`} className="block">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-bold text-lg mb-1">{show.name}</h3>
                  <p className="text-sm text-white/80">{show.artist.name}</p>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-white/60" />
                    <span className="text-white/80">{show.date}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-white/60" />
                    <span className="text-white/80">{show.venue.name}, {show.venue.city}, {show.venue.state}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="m-4">
                  View setlist
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpcomingShows;
