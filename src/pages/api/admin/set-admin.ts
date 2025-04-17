import { supabase } from '@/integrations/supabase/client';

// Custom types to avoid dependency on Express
type CustomRequest = {
  method: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

type CustomResponse = {
  status: (code: number) => CustomResponse;
  json: (data: ApiResponse) => void;
};

// API handler for setting admin status
export default async function handler(req: CustomRequest, res: CustomResponse) {
  try {
    // Get session to check authentication
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }

    // Check if the user is the specified email
    const userEmail = session.user.email;
    if (userEmail !== 'seth@bambl.ing') {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to become admin" 
      });
    }

    // Check if user is already an admin
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Error checking admin status:', adminError);
      return res.status(500).json({ 
        success: false, 
        message: `Database error: ${adminError.message}` 
      });
    }

    // If not an admin, add to admins table
    if (adminError && adminError.code === 'PGRST116') {
      const { data: newAdmin, error: createError } = await supabase
        .from('admins')
        .insert([
          { 
            user_id: session.user.id
          }
        ])
        .select();

      if (createError) {
        console.error('Error creating admin:', createError);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to create admin: ${createError.message}` 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: "Admin status granted successfully", 
        data: newAdmin ? newAdmin[0] : { user_id: session.user.id }
      });
    }

    // If already an admin
    return res.status(200).json({ 
      success: true, 
      message: "Already an admin", 
      data: adminData || { user_id: session.user.id }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
}
