import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Admin page component
 * Redirects to the sync test page
 */
const Admin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Admin | TheSet';
    // Redirect to sync test page
    navigate('/admin/sync-test');
  }, [navigate]);

  return null;
};

export default Admin;
