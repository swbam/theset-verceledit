import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Loader2 } from 'lucide-react';

const Admin = () => {
  const { isAuthenticated, isLoading, profile } = useAuth();

  useEffect(() => {
    document.title = 'Admin Dashboard | TheSet';
    console.log('Auth state:', { isAuthenticated, isLoading, profile });
  }, [isAuthenticated, isLoading, profile]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Temporarily bypass auth check for debugging
  // if (!isAuthenticated || !profile?.is_admin) {
  //   return <Navigate to="/auth" replace />;
  // }

  return <AdminDashboard />;
};

export default Admin;
