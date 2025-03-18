import React from 'react';
import { Search, Vote, Sparkles } from 'lucide-react';

const HowItWorks = () => {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">How TheSet Works</h2>
          <p className="text-white/60 max-w-2xl mx-auto text-sm">
            Shape the perfect concert experience by voting on setlists for your favorite artists.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/5 border border-white/10 rounded-full h-16 w-16 flex items-center justify-center mb-6">
              <div className="relative">
                <span className="absolute -top-10 -left-2 text-3xl font-bold text-white/10">1</span>
                <Search className="h-7 w-7 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Find Your Artist</h3>
            <p className="text-white/60 text-sm max-w-xs mx-auto">
              Search for any artist on our site and discover their upcoming concerts near you.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/5 border border-white/10 rounded-full h-16 w-16 flex items-center justify-center mb-6">
              <div className="relative">
                <span className="absolute -top-10 -left-2 text-3xl font-bold text-white/10">2</span>
                <Vote className="h-7 w-7 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Vote on Songs</h3>
            <p className="text-white/60 text-sm max-w-xs mx-auto">
              Cast your votes to shape the setlist and see what other fans want to hear live.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/5 border border-white/10 rounded-full h-16 w-16 flex items-center justify-center mb-6">
              <div className="relative">
                <span className="absolute -top-10 -left-2 text-3xl font-bold text-white/10">3</span>
                <Sparkles className="h-7 w-7 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Experience the Magic</h3>
            <p className="text-white/60 text-sm max-w-xs mx-auto">
              Attend concerts with setlists shaped by fans for an unforgettable experience.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
