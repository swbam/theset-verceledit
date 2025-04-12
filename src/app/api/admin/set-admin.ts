import { createServiceRoleClient } from "@/integrations/supabase/utils"; // Use service role client for auth tables

// API handler for setting the current user as admin
export async function handler(req: Request) {
  const supabaseAdmin = createServiceRoleClient(); // Create admin client for auth tables

  try {
    // Get session to check authentication
    const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
    
    if (sessionError || !session) {
      return Response.json({ 
        success: false, 
        message: "Not authenticated" 
      }, { status: 401 });
    }
    
    // Check if the user is the specified email
    const userEmail = session.user.email;
    if (userEmail !== 'seth@bambl.ing') {
      return Response.json({ 
        success: false, 
        message: "Not authorized to become admin" 
      }, { status: 403 });
    }
    
    // Check current admin status
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(session.user.id);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return Response.json({ 
        success: false, 
        message: `Database error: ${userError.message}` 
      }, { status: 500 });
    }
    
    // Check if already admin
    const isAdmin = user?.user_metadata?.is_admin || false;
    if (isAdmin) {
      return Response.json({ 
        success: true, 
        message: "Already an admin", 
        data: user 
      });
    }
    
    // Update user metadata to set admin status
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      session.user.id,
      { 
        user_metadata: {
          ...user?.user_metadata, // Preserve existing metadata
          is_admin: true,
          full_name: user?.user_metadata?.full_name || 'Site Admin'
        }
      }
    );
    
    if (updateError) {
      console.error('Error updating user:', updateError);
      return Response.json({ 
        success: false, 
        message: `Failed to update user: ${updateError.message}` 
      }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: "Admin status updated successfully", 
      data: updatedUser 
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({ 
      success: false, 
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
