
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import UserJourneyTest from '@/components/testing/UserJourneyTest';

const TestJourney = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">User Journey Test</h1>
            <p className="text-muted-foreground">
              This test simulates the complete user journey from artist search to setlist voting
              and provides detailed information about each step in the process.
            </p>
          </div>
          
          <UserJourneyTest />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TestJourney;
