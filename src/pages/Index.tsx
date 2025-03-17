
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import UpcomingShows from '@/components/home/UpcomingShows';
import HowItWorks from '@/components/home/HowItWorks';
import PersonalizedRecommendations from '@/components/home/PersonalizedRecommendations';
import TrendingShows from '@/components/home/TrendingShows';
import LiveVotingSection from '@/components/home/LiveVotingSection';
import MostVotedSongs from '@/components/home/MostVotedSongs';
import { useDocumentTitle } from '@/hooks/use-document-title';

const Index = () => {
  useDocumentTitle('', 'Join TheSet to vote on setlists for upcoming concerts and influence what your favorite artists will play live.');
  
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar showSearch={false} />
      
      <main className="flex-grow">
        <Hero />
        <PersonalizedRecommendations />
        <TrendingShows />
        <FeaturedArtists />
        <UpcomingShows />
        <HowItWorks />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 py-12 max-w-7xl mx-auto">
          <LiveVotingSection />
          <MostVotedSongs />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
