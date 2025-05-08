import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works | The Set',
  description: 'Learn how The Set crowdsources concert setlists.',
};

export default function HowItWorksPage() {
  return (
    <div className="container max-w-3xl mx-auto py-12 px-4 prose prose-invert">
      <h1>How It Works</h1>
      <p>
        The Set lets fans vote on the songs they most want to hear at upcoming concerts. We
        aggregate fan preferences and share them with artists so they can craft setlists that
        delight the crowd while maintaining creative control.
      </p>
      <ol>
        <li>Search for your favourite artist or upcoming show.</li>
        <li>Vote on the songs you want to hear.</li>
        <li>See real-time ranking as other fans vote.</li>
        <li>Artists review the data and finalise their setlist.</li>
      </ol>
      <p>
        Votes reset after each tour, giving every era a fresh slate. Join the community and help
        shape the soundtrack of live music!
      </p>
    </div>
  );
} 