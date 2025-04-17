
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  full_name: string;
  provider: string;
  is_admin: boolean;
  created_at: string;
  avatar_url: string | null;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Using admins table as a proxy to display admin users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all admin user IDs
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id, created_at');
      
      if (adminError) throw adminError;
      
      // Create a static implementation using admin data
      // In a real implementation, we would need a serverless function
      // to get user data from auth.users
      const staticUserData = (adminData || []).map(admin => ({
        id: admin.user_id,
        username: `admin_${admin.user_id.substring(0, 6)}`,
        full_name: `Admin User`,
        provider: 'email',
        is_admin: true,
        created_at: admin.created_at || new Date().toISOString(),
        avatar_url: null
      }));
      
      // Add a couple of static non-admin users for demo purposes
      const demoUsers = [
        {
          id: 'demo-user-1',
          username: 'user1',
          full_name: 'Regular User',
          provider: 'email',
          is_admin: false,
          created_at: new Date().toISOString(),
          avatar_url: null
        },
        {
          id: 'demo-user-2',
          username: 'user2',
          full_name: 'Test User',
          provider: 'google',
          is_admin: false,
          created_at: new Date().toISOString(),
          avatar_url: null
        }
      ];
      
      // Filter by search query if any
      let filteredUsers = [...staticUserData, ...demoUsers];
      if (searchQuery) {
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };
  
  const toggleAdminStatus = async (userId, currentStatus) => {
    try {
      if (!currentStatus) {
        // Make user an admin by adding to admins table
        const { error } = await supabase
          .from('admins')
          .insert({
            user_id: userId,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
      } else {
        // Remove admin status by deleting from admins table
        const { error } = await supabase
          .from('admins')
          .delete()
          .eq('user_id', userId);
          
        if (error) throw error;
      }
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: !currentStatus } 
          : user
      ));
      
      toast.success(`User ${!currentStatus ? 'promoted to admin' : 'demoted from admin'}`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users Management</h2>
        <Button 
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-[100px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                      <AvatarFallback>
                        {user.username?.charAt(0)?.toUpperCase() || 
                         user.full_name?.charAt(0)?.toUpperCase() || 
                         '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{user.username || 'N/A'}</TableCell>
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>
                    {user.provider ? (
                      <Badge variant="outline" className="capitalize">
                        {user.provider}
                      </Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={user.is_admin ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                    >
                      {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
