
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
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <div className="bg-black/40 border border-white/10 rounded-xl p-8 md:p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-black/60 flex items-center justify-center rounded-full mb-4">
            <Music className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Personalized Recommendations</h2>
          <p className="text-white/70 mb-6 max-w-md">
            Connect your Spotify account to see personalized artists, concerts and upcoming shows
          </p>
          
          <Button 
            onClick={handleConnectSpotify} 
            className="bg-white text-black hover:bg-white/90 font-medium"
          >
            Connect Spotify
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PersonalizedRecommendations;
