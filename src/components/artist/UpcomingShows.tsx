
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music, ArrowRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/api/mock-service';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({
  shows,
  artistName
}: UpcomingShowsProps) => {
  // If no shows, display a message
  if (!shows.length) {
    return (
      <section className="px-6 md:px-8 lg:px-12 py-12 app-gradient">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
              <p className="text-white/70 mt-1">No upcoming shows found for {artistName}</p>
            </div>
          </div>
          
          <div className="text-center p-10 border border-white/10 rounded-xl card-gradient">
            <p className="text-lg mb-4 text-white">No upcoming concerts found for this artist.</p>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link to="/shows">Discover other shows</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Display shows in a table/list format
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 app-gradient bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-white/70 mt-1">Vote on setlists for upcoming shows</p>
          </div>
          
          {shows.length > 8 && (
            <Button variant="ghost" className="mt-4 md:mt-0 group text-white hover:text-white hover:bg-white/5" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center">
                See all {shows.length} shows
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          )}
        </div>
        
        <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="py-4 px-6 text-left text-sm font-medium text-white/70">Date</th>
                  <th className="py-4 px-6 text-left text-sm font-medium text-white/70">Venue</th>
                  <th className="py-4 px-6 text-left text-sm font-medium text-white/70 hidden md:table-cell">Location</th>
                  <th className="py-4 px-6 text-right text-sm font-medium text-white/70"></th>
                </tr>
              </thead>
              <tbody>
                {shows.slice(0, 8).map((show, index) => (
                  <tr 
                    key={show.id} 
                    className={`group hover:bg-white/5 transition-colors ${index !== shows.length - 1 ? 'border-b border-white/5' : ''}`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{formatDate(show.date, false)}</span>
                        <span className="text-white/60 text-sm">{new Date(show.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">{show.venue?.name || "Venue TBA"}</div>
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell">
                      <div className="flex items-center text-white/70">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {show.venue?.city || ""}
                          {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white" size="sm" asChild>
                        <Link to={`/shows/${show.id}`}>
                          <Ticket className="h-4 w-4 mr-2" />
                          <span>View Setlist</span>
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shows.length > 8 && (
            <div className="p-4 border-t border-white/10 bg-white/5">
              <Button variant="ghost" className="w-full text-white hover:text-white hover:bg-white/10" asChild>
                <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  See all {shows.length} shows
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default UpcomingShows;
