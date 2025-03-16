
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

const ShowDetailSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-3/4" />
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-40" />
              </div>
            </div>
            
            {/* Hero Image */}
            <Skeleton className="h-64 w-full rounded-xl" />
            
            {/* Setlist Section */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-64" />
              <div className="space-y-2">
                {Array(10).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShowDetailSkeleton;
