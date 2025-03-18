
import React from 'react';
import { Music, Vote, Headphones } from 'lucide-react';

const HowItWorks = () => {
  return (
    <section className="py-20 px-4 bg-[#0A0A12]">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-2">How TheSet Works</h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Shape the perfect concert experience by voting on setlists for your favorite artists' upcoming shows
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Step 1 */}
          <div className="text-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Find Your Artist</h3>
              <p className="text-white/70">
                Search for your favorite artists and discover their upcoming concerts near you.
              </p>
              
              <div className="mt-6 bg-black/40 aspect-square max-w-[200px] mx-auto rounded-lg flex items-center justify-center">
                <Music className="h-16 w-16 text-white/30" />
              </div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="text-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Vote on Songs</h3>
              <p className="text-white/70">
                Cast your votes on songs you want to hear at the show and see what others are voting for.
              </p>
              
              <div className="mt-6 bg-black/40 aspect-square max-w-[200px] mx-auto rounded-lg flex items-center justify-center">
                <Vote className="h-16 w-16 text-white/30" />
              </div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="text-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Experience the Magic</h3>
              <p className="text-white/70">
                Attend concerts with setlists shaped by fan preferences and enjoy the music you love.
              </p>
              
              <div className="mt-6 bg-black/40 aspect-square max-w-[200px] mx-auto rounded-lg flex items-center justify-center">
                <Headphones className="h-16 w-16 text-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
