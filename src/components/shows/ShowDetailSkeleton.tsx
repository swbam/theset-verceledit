
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ShowDetailSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Header Section Skeleton */}
        <section className="relative bg-secondary/70 py-20">
          <div className="px-6 md:px-8 lg:px-12 relative z-10">
            <div className="max-w-7xl mx-auto">
              <Skeleton className="h-4 w-32 mb-6" />
              <Skeleton className="h-10 w-3/4 mb-3" />
              <Skeleton className="h-6 w-1/2 mb-6" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mt-8">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-48" />
              </div>
              
              <Skeleton className="h-10 w-36 mt-8" />
            </div>
          </div>
        </section>
        
        {/* Setlist Section Skeleton */}
        <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/20">
          <div className="max-w-5xl mx-auto">
            <Card className="bg-card shadow-md border-border/50">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Skeleton className="h-6 w-6 mr-3" />
                      <Skeleton className="h-6 w-48" />
                    </div>
                    <div className="flex items-center">
                      <Skeleton className="h-6 w-16 mr-4" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Skeleton className="h-24 w-full mt-8 rounded-lg" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ShowDetailSkeleton;
