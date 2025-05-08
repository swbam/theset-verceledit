import { redirect } from 'next/navigation';
import { adminPageAuth } from "@/lib/auth/admin-auth";

export const metadata = {
  title: "Admin Dashboard | TheSet",
  description: "Admin dashboard for TheSet platform",
};

export default async function AdminPage() {
  // Check admin authentication
  await adminPageAuth();
  
  // Redirect to the setlists admin page
  redirect('/admin/setlists');
} 