
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import UserJourneyTest from '@/components/testing/UserJourneyTest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';
import { TEST_ARTIST_ID, TEST_ARTIST_NAME } from '@/tests/journey/config';

const TestJourney = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  
  const handleArtistSelect = (artist: any) => {
    setSelectedArtist(artist);
    setSearchQuery(''); // Clear search after selection
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">User Journey Test</h1>
            <p className="text-muted-foreground mb-6">
              This test simulates the complete user journey from artist search to setlist voting
              and provides detailed information about each step in the process.
            </p>
            
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Select an Artist to Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-lg">
                  <SearchBar
                    placeholder="Search for an artist to test..."
                    onChange={setSearchQuery}
                    value={searchQuery}
                    className="mb-2"
                    disableRedirect={true}
                  >
                    {searchQuery.length > 2 && (
                      <ArtistSearchResults
                        query={searchQuery}
                        onSelect={handleArtistSelect}
                      />
                    )}
                  </SearchBar>
                  
                  {selectedArtist ? (
                    <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                      <p className="font-medium">Selected Artist: {selectedArtist.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {selectedArtist.id}</p>
                      <p className="text-xs mt-2">
                        Default artist: {TEST_ARTIST_NAME} (ID: {TEST_ARTIST_ID})
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm">
                        No artist selected. The test will use the default artist: {TEST_ARTIST_NAME}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <UserJourneyTest 
            customArtistId={selectedArtist?.id}
            customArtistName={selectedArtist?.name}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TestJourney;
