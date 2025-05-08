import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Import | The Set',
  description: 'Import an artist or show by Ticketmaster ID',
};

export default function ImportPage() {
  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Import</h1>
      <p className="text-muted-foreground mb-4">This feature is coming soon. You will be able to import artists or events using Ticketmaster IDs.</p>
      {/* TODO: implement import form */}
    </div>
  );
} 