import React from 'react';
import { Metadata } from 'next';
import ArtistGrid from '@/components/artists/ArtistGrid';

export const metadata: Metadata = {
  title: 'Artists | The Set',
  description: 'Browse artists with upcoming shows',
};

export const dynamic = 'force-dynamic';

export default function ArtistsPage() {
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <ArtistGrid />
    </div>
  );
} 