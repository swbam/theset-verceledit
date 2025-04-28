import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import { Show } from '@/types';

interface ShowsGridProps {
  shows: Show[];
}

export default function ShowsGrid({ shows }: ShowsGridProps) {
  if (shows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-xl font-semibold mb-2">No upcoming shows found</h3>
        <p className="text-white/70">Check back later for new shows.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {shows.map((show) => (
        <Link
          href={`/show/${show.id}`}
          key={show.id}
          className="bg-card hover:bg-card/80 rounded-xl overflow-hidden transition-all"
        >
          <div className="relative h-48 w-full">
            {show.artist?.image_url ? (
              <Image
                src={show.artist.image_url}
                alt={show.artist?.name || 'Artist'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-600" />
            )}
          </div>
          <div className="p-4">
            <div className="text-sm text-white/70 mb-1">{formatDate(show.date)}</div>
            <h3 className="text-lg font-semibold mb-1">{show.artist?.name}</h3>
            <div className="text-sm text-white/70">
              {show.venue?.name}, {show.venue?.city}, {show.venue?.state}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 