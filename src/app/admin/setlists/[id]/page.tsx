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
  try {
    const setlistData = await getSetlistById(setlistId);
    
    if (!setlistData) {
      notFound();
    }
    
    // Convert to the expected format for the component
    interface DbSetlist {
      id: string;
      artist_id: string;
      songs: Array<{ 
        position: number;
        info: string | null;
        is_encore: boolean;
        song: { id: string; name: string } 
      }>;
    }
    
    // Cast to any first to bypass TypeScript error, then properly transform
    const rawSetlist = setlistData as any as DbSetlist;
    
    // Transform the data to match the expected Song interface
    const formattedSongs = rawSetlist.songs.map(item => ({
      id: item.song.id,
      name: item.song.name,
      position: item.position
    }));
    
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
            initialSongs={formattedSongs} 
            artistId={rawSetlist.artist_id} 
          />
        </div>
      </Container>
    );
  } catch (error) {
    console.error("Error fetching setlist data:", error);
    notFound();
  }
  
}
