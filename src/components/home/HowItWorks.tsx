import React from 'react';

const HowItWorks = () => {
  return (
    <section className="py-16 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-2xl font-bold text-center mb-2">How TheSet Works</h2>
        <p className="text-white/60 text-sm text-center mb-12 max-w-xl mx-auto">
          Shape the perfect concert experience by voting on setlists for your favorite artists' upcoming shows
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-xl font-semibold mb-6">
              1
            </div>
            <h3 className="text-lg font-medium mb-3">Find Your Artist</h3>
            <p className="text-white/60 text-sm">
              Search for your favorite artists on the site and discover their upcoming concerts near you.
            </p>
            <div className="h-32 w-full rounded-lg bg-zinc-900 mt-6 flex items-center justify-center text-white/20">
              Artist search illustration
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-xl font-semibold mb-6">
              2
            </div>
            <h3 className="text-lg font-medium mb-3">Vote on Songs</h3>
            <p className="text-white/60 text-sm">
              Cast your votes on songs you want to hear at the show and watch as they rise in the community rankings.
            </p>
            <div className="h-32 w-full rounded-lg bg-zinc-900 mt-6 flex items-center justify-center text-white/20">
              Voting illustration
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-xl font-semibold mb-6">
              3
            </div>
            <h3 className="text-lg font-medium mb-3">Experience the Magic</h3>
            <p className="text-white/60 text-sm">
              Attend concerts with setlists shaped by fans like you and enjoy the perfect performance.
            </p>
            <div className="h-32 w-full rounded-lg bg-zinc-900 mt-6 flex items-center justify-center text-white/20">
              Concert illustration
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
