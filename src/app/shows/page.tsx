import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/integrations/supabase/server';
import ShowsGrid from '@/components/shows/ShowsGrid';

export const metadata: Metadata = {
  title: 'All Shows | The Set',
  description: 'Browse and vote on setlists for upcoming concerts',
};

export const revalidate = 3600; // Revalidate this page every hour

export default async function ShowsPage() {
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
    <main className="container mx-auto max-w-7xl py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upcoming Shows</h1>
        <p className="text-white/80">Browse and vote on setlists for upcoming concerts</p>
      </div>
      
      <ShowsGrid shows={shows || []} />
    </main>
  );
} 