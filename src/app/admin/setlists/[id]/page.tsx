import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { adminPageAuth } from "@/lib/auth/admin-auth";
import { SetlistEditor } from "@/components/admin/setlists/setlist-editor";
import { getSetlistById } from "@/lib/api/database/setlists";

interface SetlistPageProps {
  params: {
    id: string;
  };
}

export const metadata = {
  title: "Edit Setlist | Admin",
  description: "Edit setlist songs and details",
};

export default async function EditSetlistPage({ params }: SetlistPageProps) {
  // Check admin authentication
  await adminPageAuth();
  
  const setlistId = params.id;
  
  // Fetch setlist data
  const setlist = await getSetlistById(setlistId);
  
  if (!setlist) {
    notFound();
  }
  
  return (
    <Container className="py-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Setlist</h1>
          <p className="text-muted-foreground mt-1">
            Manage songs for this setlist
          </p>
        </div>
        
        <SetlistEditor 
          setlistId={setlistId} 
          initialSongs={setlist.songs} 
          artistId={setlist.artist_id} 
        />
      </div>
    </Container>
  );
} 