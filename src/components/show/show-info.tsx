"use client";

import Link from 'next/link';
import { Calendar, MapPin, Ticket, ExternalLink, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatTime } from '@/lib/utils';

interface ShowInfoProps {
  show: {
    id: string;
    date: string;
    time?: string;
    name?: string;
    status?: string;
    attendance?: number;
    external_url?: string;
    artist: {
      id: string;
      name: string;
    };
    venue: {
      id: string;
      name: string;
      city?: string;
      state?: string;
      country?: string;
      address?: string;
    };
  };
}

export function ShowInfo({ show }: ShowInfoProps) {
  const showDate = formatDate(show.date);
  const showTime = show.time ? formatTime(show.time) : null;
  const venueName = show.venue?.name || 'Venue TBA';
  const venueLocation = [show.venue?.city, show.venue?.state, show.venue?.country]
    .filter(Boolean)
    .join(', ');
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Show Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Date & Time</p>
            <p className="text-muted-foreground text-sm">{showDate} {showTime && `at ${showTime}`}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Venue</p>
            <p className="text-muted-foreground text-sm">{venueName}</p>
            {venueLocation && (
              <p className="text-muted-foreground text-sm">{venueLocation}</p>
            )}
            {show.venue?.address && (
              <p className="text-muted-foreground text-sm">{show.venue.address}</p>
            )}
          </div>
        </div>
        
        {show.attendance && (
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Attendance</p>
              <p className="text-muted-foreground text-sm">{show.attendance.toLocaleString()} people</p>
            </div>
          </div>
        )}
        
        {show.status && (
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className="text-muted-foreground text-sm">{show.status}</p>
            </div>
          </div>
        )}
        
        {show.external_url && (
          <Button variant="outline" size="sm" className="w-full mt-4" asChild>
            <Link 
              href={show.external_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1"
            >
              <Ticket className="h-4 w-4 mr-1" />
              <span>Get Tickets</span>
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 