import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/integrations/supabase/server';
import ShowsGrid from '@/components/shows/ShowsGrid';
import TrendingShows from '@/components/shows/TrendingShows'
import FeaturedArtistsSection from '@/components/shows/FeaturedArtistsSection'
import UpcomingShowsSection from '@/components/shows/UpcomingShowsSection'

export const metadata: Metadata = {
  title: 'All Shows | The Set',
  description: 'Browse and vote on setlists for upcoming concerts',
};

export const revalidate = 3600; // Revalidate this page every hour

export const dynamic = 'force-dynamic'

export default function ShowsPage() {
  const supabase = createClient();
  
  // Fetch shows from Supabase
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      *,
      artist:artists(id, name, image_url, genres),
      venue:venues(id, name, city, state, country)
    `)
    .gt('date', new Date().toISOString()) // Only future shows
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching shows:', error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Header can be implemented later */}
      <TrendingShows />
      <FeaturedArtistsSection />
      <UpcomingShowsSection />
    </div>
  );
} 