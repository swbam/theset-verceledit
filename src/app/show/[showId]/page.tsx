import { Loader2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowHero } from "@/components/show/show-hero";
import { ShowInfo } from "@/components/show/show-info";
import { SetlistSongRequests } from "@/components/setlist/setlist-song-requests";
import { getShow } from "@/lib/api/database/shows";
import { getSetlistForShow } from "@/lib/api/database/setlists";

interface Props {
  params: {
    showId: string;
  };
}

export default async function ShowPage({ params }: Props) {
  const { showId } = params;
  
  const show = await getShow(showId);
  // Check if show exists
  if (!show) {
    return <div className="p-8">Show not found.</div>;
  }

  // Add checks for required nested data (artist and venue) needed by components
  if (!show.artist) {
    console.error(`Show ${showId} is missing required artist data.`);
    // Optionally fetch artist separately here if desired, or show error
    return <div className="p-8">Show data is incomplete (missing artist info).</div>;
  }
  if (!show.venue) {
     console.error(`Show ${showId} is missing required venue data.`);
     // Optionally fetch venue separately here if desired, or show error
     return <div className="p-8">Show data is incomplete (missing venue info).</div>;
  }
  // If we reach here, show, show.date, show.artist, and show.venue are guaranteed non-null
  
  // Get the setlist for this show, which will create one if it doesn't exist
  let setlist: any = null;
  try {
    // First, get the raw data and cast it to 'any' to bypass type checks
    const rawSetlistData: any = await getSetlistForShow(showId);
    
    // Check if we have valid data
    if (rawSetlistData && typeof rawSetlistData !== 'string' && !rawSetlistData.error) {
      // Transform the raw data into the expected shape
      setlist = {
        id: rawSetlistData.id || '',
        artist_id: rawSetlistData.artist_id || '',
        songs: (rawSetlistData.songs || []).map((songItem: any) => {
          const songData = songItem.song || songItem;
          return {
            id: songData?.id || songItem?.id || '',
            name: songData?.name || songItem?.name || 'Unknown Song',
            position: songItem?.position || 0,
            votes: songItem?.vote_count || 0,
            spotify_id: songData?.spotify_id,
            preview_url: songData?.preview_url,
            duration_ms: songData?.duration_ms,
          };
        }),
        show: {
          id: showId,
          name: show.name || 'Unknown Show',
          date: show.date || new Date().toISOString()
        }
      };
    }
  } catch (error) {
    console.error("Error fetching setlist:", error);
    // setlist will remain undefined
  }
  
  return (
    <div className="min-h-screen">
      <div className="relative w-full">
        <ShowHero show={show} />
      </div>
      
      <Container className="py-8">
        <Tabs defaultValue="request">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="request">Request Songs</TabsTrigger>
              <TabsTrigger value="info">Show Info</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="request">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Request your favorites
              </h2>
              
              {/* Setlist song request section */}
              {setlist ? (
                <SetlistSongRequests setlist={setlist} showId={showId} />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                  <p>Loading setlist...</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="info">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold">Show Info</h2>
              {/* No need for conditional check here anymore, handled above */}
              <ShowInfo show={show} />
            </div>
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
}
