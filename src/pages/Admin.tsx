import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MainLayout from '@/components/layout/MainLayout';

/**
 * Admin page component
 */
const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Admin Dashboard | TheSet';
    
    const checkAdminStatus = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        
        // Check if user is in admins table
        const { data: adminData, error } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .single();
          
        if (error || !adminData) {
          console.error("Admin check failed:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-8 text-center">
          <p>Loading admin dashboard...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container mx-auto p-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p>You don't have permission to access the admin dashboard.</p>
              <Button onClick={() => navigate('/')}>Back to Home</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <Tabs defaultValue="setlists" className="space-y-4">
          <TabsList>
            <TabsTrigger value="setlists">Setlists</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="shows">Shows</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setlists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Setlist Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/admin/setlists')}>
                  Manage Setlists
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="artists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Artist Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Artist management tools coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shows" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Show Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Show management tools coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sync Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Data synchronization tools using unified-sync-v2 coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;
