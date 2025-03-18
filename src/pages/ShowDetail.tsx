import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/auth';
import ShowHeader from '@/components/shows/ShowHeader';
import SetlistSection from '@/components/shows/SetlistSection';
import ShowDetailSkeleton from '@/components/shows/ShowDetailSkeleton';
import ShowNotFound from '@/components/shows/ShowNotFound';
import { useShowDetails } from '@/hooks/use-show-details';

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Fetch show details
  const { 
    show, 
    isLoadingShow, 
    isError, 
    showError, 
    spotifyArtistId 
  } = useShowDetails(id);
  
  // Set document title with appropriate format
  useEffect(() => {
    if (show && !isLoadingShow) {
      const artistName = show.artist?.name || 'Artist';
      const venueName = show.venue?.name || 'Venue';
      const venueCity = show.venue?.city || '';
      const venueState = show.venue?.state || '';
      const venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : (venueCity || venueState || 'Location');
      
      // Format date
      const showDate = new Date(show.date);
      const formattedDate = showDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
      
      const title = `${artistName} at ${venueName} in ${venueLocation} | ${formattedDate}`;
      const description = `Vote on ${artistName}'s setlist for their show at ${venueName} in ${venueLocation} on ${formattedDate}. Influence what songs they'll play live!`;
      
      document.title = `TheSet | ${title}`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [show, isLoadingShow]);
  
  // Handle navigation on error
  useEffect(() => {
    if (!isLoadingShow && isError && showError) {
      toast.error("Could not find show details");
      navigate('/shows', { replace: true });
    }
  }, [show, isLoadingShow, isError, showError, navigate]);
  
  if (isLoadingShow) {
    return <ShowDetailSkeleton />;
  }
  
  if (isError || !show) {
    return <ShowNotFound />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      
      <main className="flex-grow">
        <ShowHeader show={show} />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-8/12">
              {spotifyArtistId && (
                <SetlistSection 
                  showId={id || ''}
                  spotifyArtistId={spotifyArtistId}
                />
              )}
            </div>
            
            <div className="w-full lg:w-4/12">
              <div className="bg-zinc-900 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
                    <path 
                      fill="currentColor" 
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    />
                  </svg>
                  Voting Stats
                </h2>
                {show.total_votes !== undefined && (
                  <>
                    <div className="mb-4">
                      <div className="text-sm text-zinc-400">Total Votes</div>
                      <div className="text-3xl font-bold">{show.total_votes || 0}</div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-white h-full rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm text-zinc-400">Voting Closes In</div>
                      <div className="text-xl font-semibold">2d 14h</div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <svg viewBox="0 0 24 24" width="16" height="16" className="text-zinc-400">
                        <path 
                          fill="currentColor" 
                          d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                        />
                      </svg>
                      <span>{show.fans_voted || 0} fans have voted</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="bg-zinc-900 rounded-lg p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
                    <path 
                      fill="currentColor" 
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                    />
                  </svg>
                  How It Works
                </h2>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>Vote for songs you want to hear at this show. The most voted songs rise to the top of the list.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>Anyone can add songs to the setlist! Select from the dropdown above to help build the perfect concert.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>Non-logged in users can vote for up to 3 songs. Create an account to vote for unlimited songs!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>Voting closes 2 hours before the show</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
