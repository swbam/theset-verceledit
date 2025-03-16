
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ShowDetailSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-secondary rounded w-1/4"></div>
            <div className="h-12 bg-secondary rounded w-3/4"></div>
            <div className="h-64 bg-secondary rounded"></div>
            <div className="h-96 bg-secondary rounded"></div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShowDetailSkeleton;
