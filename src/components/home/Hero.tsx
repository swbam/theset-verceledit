import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MusicIcon, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth/AuthContext';

const Hero = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loginWithSpotify } = useAuth();
  
  return (
    <section className="relative bg-black overflow-hidden">
      {/* Background pattern - using only neutral colors */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-zinc-500 blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-zinc-700 blur-3xl"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-6 max-w-3xl">
          Vote on the setlists you want to hear
        </h1>
        
        <p className="text-xl md:text-2xl text-zinc-300 mb-8 max-w-2xl">
          Discover upcoming concerts and help shape the perfect shows by voting for your favorite songs.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button 
            size="lg" 
            className="text-lg px-8 bg-white hover:bg-zinc-200 text-black"
            onClick={() => navigate('/search')}
          >
            Find Shows <Search className="ml-2 h-4 w-4" />
          </Button>
          
          {!isAuthenticated && (
            <Button 
              size="lg" 
              className="text-lg px-8"
              variant="outline" 
              onClick={loginWithSpotify}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none" className="mr-2 h-5 w-5">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Connect Spotify
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
