
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import HowItWorks from '@/components/home/HowItWorks';
import FeaturedShows from '@/components/home/FeaturedShows';
import ShowsByGenre from '@/components/artists/ShowsByGenre';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar showSearch={false} />
      
      <main className="flex-grow">
        <Hero />
        <FeaturedArtists />
        <HowItWorks />
        <FeaturedShows />
        <ShowsByGenre genreId="KnvZfZ7vAeA" genreName="Pop" limit={4} />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
