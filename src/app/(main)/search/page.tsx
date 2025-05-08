import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search | The Set',
  description: 'Search artists and shows',
};

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q?.toString() || '';

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Search</h1>
      {query ? (
        <p className="text-muted-foreground">Search for: <span className="font-medium">{query}</span></p>
      ) : (
        <p className="text-muted-foreground">No search query provided.</p>
      )}
      {/* TODO: implement actual search results grid */}
    </div>
  );
} 