import React from 'react';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

const PersonalizedRecommendations = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleConnectSpotify = () => {
    navigate('/auth');
  };

  return (
    <section className="py-10 px-4 text-center">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-full flex items-center justify-center">
            <Music className="h-8 w-8 text-white" strokeWidth={1.5} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Personalized Recommendations</h2>
        <p className="text-white/60 mb-6 max-w-lg mx-auto text-sm">
          Connect your Spotify account to see personalized recommendations and upcoming shows.
        </p>
        
        <div className="flex justify-center">
          <Button 
            onClick={handleConnectSpotify} 
            variant="outline"
            className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white px-6"
          >
            Connect Spotify
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PersonalizedRecommendations;
