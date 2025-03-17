
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import UpcomingShows from '@/components/home/UpcomingShows';
import TrendingShows from '@/components/shows/TrendingShows';
import HowItWorks from '@/components/home/HowItWorks';
import PersonalizedRecommendations from '@/components/home/PersonalizedRecommendations';
import { useDocumentTitle } from '@/hooks/use-document-title';

const Index = () => {
  // Set document title for homepage
  useDocumentTitle('', 'Join TheSet to vote on setlists for upcoming concerts and influence what your favorite artists will play live.');
  
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A10]">
      <Navbar showSearch={false} />
      
      <main className="flex-grow">
        <Hero />
        <UpcomingShows />
        <TrendingShows />
        <FeaturedArtists />
        <PersonalizedRecommendations />
        <HowItWorks />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
