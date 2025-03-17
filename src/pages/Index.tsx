
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import UpcomingShows from '@/components/home/UpcomingShows';
import HowItWorks from '@/components/home/HowItWorks';
import PersonalizedRecommendations from '@/components/home/PersonalizedRecommendations';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useQuery } from '@tanstack/react-query';
import { getTrendingConcerts } from '@/lib/ticketmaster';

const Index = () => {
  // Set document title for homepage
  useDocumentTitle('', 'Join TheSet to vote on setlists for upcoming concerts and influence what your favorite artists will play live.');
  
  // Fetch all shows once to distribute among sections
  const { data: allShows = [] } = useQuery({
    queryKey: ['allHomepageShows'],
    queryFn: async () => {
      try {
        // Fetch a larger set of shows to distribute
        const events = await getTrendingConcerts(30);
        return events;
      } catch (error) {
        console.error("Failed to fetch shows for homepage:", error);
        return [];
      }
    },
  });
  
  // Process shows to prevent duplicates across sections
  const [processedShows, setProcessedShows] = useState<{ 
    upcomingShows: any[], 
    trendingShows: any[] 
  }>({
    upcomingShows: [],
    trendingShows: []
  });
  
  useEffect(() => {
    if (allShows.length > 0) {
      // Prevent duplicate artists by tracking artist IDs we've seen
      const seenArtistIds = new Set();
      const upcoming: any[] = [];
      const trending: any[] = [];
      
      // First populate the trending shows (first section)
      allShows.forEach(show => {
        const artistId = show.artist?.id;
        
        if (artistId && !seenArtistIds.has(artistId) && trending.length < 8) {
          trending.push(show);
          seenArtistIds.add(artistId);
        }
      });
      
      // Then populate upcoming shows with different artists
      allShows.forEach(show => {
        const artistId = show.artist?.id;
        
        if (artistId && !seenArtistIds.has(artistId) && upcoming.length < 8) {
          upcoming.push(show);
          seenArtistIds.add(artistId);
        }
      });
      
      setProcessedShows({
        upcomingShows: upcoming,
        trendingShows: trending
      });
    }
  }, [allShows]);
  
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A10]">
      <Navbar showSearch={false} />
      
      <main className="flex-grow">
        <Hero />
        <UpcomingShows preloadedShows={processedShows.upcomingShows} />
        <FeaturedArtists />
        <PersonalizedRecommendations preloadedShows={processedShows.trendingShows} />
        <HowItWorks />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
