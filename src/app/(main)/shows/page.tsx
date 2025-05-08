import React from 'react';
import { Metadata } from 'next';
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
  // Future: could fetch shows if needed

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TrendingShows />
      <FeaturedArtistsSection />
      <UpcomingShowsSection />
    </div>
  );
} 