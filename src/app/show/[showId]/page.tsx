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
  if (!show) {
    return <div className="p-8">Show not found.</div>;
  }
  
  // Get the setlist for this show, which will create one if it doesn't exist
  const setlist = await getSetlistForShow(showId);
  
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
              <ShowInfo show={show} />
            </div>
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
} 