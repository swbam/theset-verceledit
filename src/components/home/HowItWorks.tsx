import React from 'react';
import { Search, Vote, Wand2 } from 'lucide-react';

const HowItWorks = () => {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How TheSet Works</h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Shape the perfect concert experience by voting on setlists for your favorite artists' upcoming shows.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col items-center text-center">
            <div className="bg-zinc-900 rounded-full h-16 w-16 flex items-center justify-center mb-4 border border-zinc-800">
              <div className="bg-zinc-800 rounded-full h-12 w-12 flex items-center justify-center">
                <span className="text-xl font-bold">1</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Find Your Artist</h3>
            <p className="text-zinc-400 mb-6">
              Search for your favorite artists and see their upcoming concerts near you.
            </p>
            <div className="mt-2 h-32 relative w-full max-w-[280px]">
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full h-full flex items-center justify-center">
                <Search className="w-10 h-10 text-zinc-500" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-zinc-900 rounded-full h-16 w-16 flex items-center justify-center mb-4 border border-zinc-800">
              <div className="bg-zinc-800 rounded-full h-12 w-12 flex items-center justify-center">
                <span className="text-xl font-bold">2</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Vote on Songs</h3>
            <p className="text-zinc-400 mb-6">
              Cast your votes to shape the setlist and see what others want to hear.
            </p>
            <div className="mt-2 h-32 relative w-full max-w-[280px]">
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full h-full flex items-center justify-center">
                <Vote className="w-10 h-10 text-zinc-500" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="bg-zinc-900 rounded-full h-16 w-16 flex items-center justify-center mb-4 border border-zinc-800">
              <div className="bg-zinc-800 rounded-full h-12 w-12 flex items-center justify-center">
                <span className="text-xl font-bold">3</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Experience the Magic</h3>
            <p className="text-zinc-400 mb-6">
              Attend concerts with setlists shaped by fans for a more personal experience.
            </p>
            <div className="mt-2 h-32 relative w-full max-w-[280px]">
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full h-full flex items-center justify-center">
                <Wand2 className="w-10 h-10 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
