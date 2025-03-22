import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminOverview from './AdminOverview';
import AdminArtists from './AdminArtists';
import AdminShows from './AdminShows';
import AdminSetlists from './AdminSetlists';
import AdminUsers from './AdminUsers';
import AdminSeedData from './AdminSeedData';
import TestDatabaseIntegration from './TestDatabaseIntegration';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="shows">Shows</TabsTrigger>
            <TabsTrigger value="setlists">Setlists</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="seed-data">Seed Data</TabsTrigger>
            <TabsTrigger value="test-db">Test DB</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>
          
          <TabsContent value="artists">
            <AdminArtists />
          </TabsContent>
          
          <TabsContent value="shows">
            <AdminShows />
          </TabsContent>
          
          <TabsContent value="setlists">
            <AdminSetlists />
          </TabsContent>
          
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
          
          <TabsContent value="seed-data">
            <AdminSeedData />
          </TabsContent>
          
          <TabsContent value="test-db">
            <TestDatabaseIntegration />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
