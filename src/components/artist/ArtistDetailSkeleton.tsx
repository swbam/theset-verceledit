
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ArtistDetailSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-48 h-48 rounded-xl bg-secondary"></div>
              <div className="space-y-4 flex-1">
                <div className="h-10 bg-secondary rounded w-1/3"></div>
                <div className="h-5 bg-secondary rounded w-1/4"></div>
                <div className="h-4 bg-secondary rounded w-1/2 mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArtistDetailSkeleton;
