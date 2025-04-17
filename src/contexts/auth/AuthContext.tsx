
import React, { createContext, useContext, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { AuthContextType } from './types';
import { supabase } from '@/integrations/supabase/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSupabaseAuth();

  // Check if admin exists on auth state change
  useEffect(() => {
    const checkAndSetupAdmin = async () => {
      // Special handling for the hardcoded admin email
      if (auth.user?.email === 'a@theset.live') {
        try {
          // Check if user exists in the admins table
          const { data: adminEntry, error: adminCheckError } = await supabase
            .from('admins')
            .select('user_id')
            .eq('user_id', auth.user.id)
            .maybeSingle();

          if (adminCheckError) {
            console.error('Error checking admin table:', adminCheckError);
            return; // Don't proceed if check fails
          }

          // If user is not in the admins table, add them
          if (!adminEntry) {
            console.log(`User ${auth.user.email} not found in admins table. Adding...`);
            const { error: insertError } = await supabase
              .from('admins')
              .insert({ user_id: auth.user.id }); // Only user_id is needed based on schema

            if (insertError) {
              console.error('Error adding user to admins table:', insertError);
            } else {
              console.log('User added to admins table:', auth.user.email);
              // Optionally update local auth state if it tracks admin status directly
              // auth.isAdmin = true; // Example if state exists
            }
          } else {
             console.log(`User ${auth.user.email} already exists in admins table.`);
          }
        } catch (error) {
          console.error('Error during admin setup check:', error);
        }
      }
    };
    
    if (auth.user) {
      checkAndSetupAdmin();
    }
  }, [auth.user]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
