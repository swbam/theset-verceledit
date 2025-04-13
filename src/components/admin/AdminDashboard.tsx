import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Keep AdminArtists for now, will refactor it
import AdminArtists from './AdminArtists';
// Import new components (will create these next)
import AdminVenues from './AdminVenues';
import AdminSyncStatus from './AdminSyncStatus';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const AdminDashboard = () => {
  // Default to 'artists' tab now
  const [activeTab, setActiveTab] = useState('artists');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Admin Sync Console</h1>
        </div>

        {/* Updated Tabs */}
        <Tabs defaultValue="artists" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="artists">Artist Sync</TabsTrigger>
            <TabsTrigger value="venues">Venue Sync</TabsTrigger>
            <TabsTrigger value="sync-status">Sync Status & Tests</TabsTrigger>
          </TabsList>

          {/* Artist Sync Tab */}
          <TabsContent value="artists">
            {/* TODO: Refactor AdminArtists to include search and sync button */}
            <AdminArtists />
          </TabsContent>

          {/* Venue Sync Tab */}
          <TabsContent value="venues">
            {/* TODO: Create AdminVenues component */}
            <AdminVenues />
          </TabsContent>

          {/* Sync Status Tab */}
          <TabsContent value="sync-status">
            {/* TODO: Create AdminSyncStatus component */}
            <AdminSyncStatus />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
