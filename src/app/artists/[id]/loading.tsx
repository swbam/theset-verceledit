import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ArtistLoading() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      {/* Artist Header Skeleton */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        <Skeleton className="h-48 w-48 rounded-full" />
        <div className="flex-1 space-y-4 text-center md:text-left">
          <Skeleton className="h-12 w-3/4 mx-auto md:mx-0" />
          <Skeleton className="h-5 w-1/3 mx-auto md:mx-0" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {/* Left content area */}
        <div className="md:col-span-2 lg:col-span-3 space-y-8">
          <section>
            <Skeleton className="h-8 w-64 mb-6" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <Card key={`show-skeleton-${i}`} className="overflow-hidden">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-full mb-2" />
                    <div className="space-y-2 mb-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator className="my-8" />
          
          <section>
            <Skeleton className="h-8 w-64 mb-6" />
            
            <div className="space-y-6">
              {Array(3).fill(0).map((_, i) => (
                <Card key={`setlist-skeleton-${i}`} className="overflow-hidden">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-full mb-2" />
                    <div className="space-y-2 mb-4">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="space-y-2">
                      {Array(5).fill(0).map((_, j) => (
                        <Skeleton key={`song-skeleton-${i}-${j}`} className="h-4 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
        
        {/* Right sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-full mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 