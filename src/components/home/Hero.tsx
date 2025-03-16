
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-background/50 z-0" />
      
      {/* Animated background circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 max-w-3xl text-center">
        <div className="inline-block animate-fade-in mb-4">
          <span className="bg-primary/10 text-primary-foreground/80 px-3 py-1 rounded-full text-sm font-medium tracking-wide">
            Launching Soon
          </span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in text-balance" style={{ animationDelay: '0.2s' }}>
          Help Shape the Perfect Concert Experience
        </h1>
        
        <p className="mt-6 text-xl text-foreground/80 animate-fade-in text-balance max-w-2xl mx-auto" style={{ animationDelay: '0.4s' }}>
          Vote on setlists for upcoming concerts, influence what your favorite artists play, and connect with other fans.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Link 
            to="/artists" 
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center"
          >
            Discover Artists
            <ArrowRight size={18} className="ml-2" />
          </Link>
          
          <Link 
            to="/how-it-works" 
            className="bg-transparent border border-border hover:border-foreground/30 px-8 py-3 rounded-lg font-medium transition-all"
          >
            How It Works
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
