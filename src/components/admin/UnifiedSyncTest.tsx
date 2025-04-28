import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";

// Form schema with validations
interface ArtistSearchResult {
  name: string;
  ticketmasterId: string;
  imageUrl?: string;
}

const syncFormSchema = z.object({
  entityType: z.enum(["artist", "venue", "show", "song"], {
    required_error: "Entity type is required",
  }),
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  ticketmasterId: z.string().optional(),
  spotifyId: z.string().optional(),
  setlistFmId: z.string().optional(),
  forceRefresh: z.boolean().default(false),
  skipDependencies: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // Validate required fields based on entity type
  switch (data.entityType) {
    case 'artist':
      if (!data.entityName && !data.ticketmasterId && !data.spotifyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one identifier (name, Ticketmaster ID, or Spotify ID) is required",
          path: ['entityName']
        });
      }
      break;
    case 'venue':
      if (!data.entityName && !data.ticketmasterId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Venue name or Ticketmaster ID is required",
          path: ['entityName']
        });
      }
      break;
    case 'show':
      if (!data.ticketmasterId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ticketmaster ID is required for shows",
          path: ['ticketmasterId']
        });
      }
      break;
    case 'song':
      if (!data.spotifyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Spotify ID is required for songs",
          path: ['spotifyId']
        });
      }
      break;
  }
});

type SyncFormValues = z.infer<typeof syncFormSchema>;

interface ArtistSearchResult {
  name: string;
  ticketmasterId: string;
  imageUrl?: string;
}

export default function UnifiedSyncTest() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ArtistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/artists?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Set up form with default values
  const form = useForm<SyncFormValues>({
    resolver: zodResolver(syncFormSchema),
    defaultValues: {
      entityType: "artist",
      entityId: "",
      entityName: "",
      ticketmasterId: "",
      spotifyId: "",
      forceRefresh: false,
      skipDependencies: false
    },
  });
  
  async function onSubmit(values: SyncFormValues) {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Create the payload based on the form inputs
      const payload = {
        entityType: values.entityType,
        entityId: values.entityId || undefined,
        entityName: values.entityName || undefined,
        ticketmasterId: values.ticketmasterId || undefined,
        spotifyId: values.spotifyId || undefined,
        options: {
          forceRefresh: values.forceRefresh,
          skipDependencies: values.skipDependencies
        }
      };
      
      // Call the unified-sync function
      const { data, error } = await supabase.functions.invoke('unified-sync', {
        body: payload,
      });
      
      if (error) {
        // Try to parse the error details if available
        let errorMessage = error.message || 'Unknown error occurred';
        try {
          const errorDetails = JSON.parse(error.message);
          if (errorDetails.error) {
            errorMessage = errorDetails.error;
          }
          if (errorDetails.details) {
            errorMessage += `: ${errorDetails.details}`;
          }
        } catch (e) {
          // Not JSON, use original message
        }
        throw new Error(errorMessage);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed without error details');
      }
      
      setResult(data);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }
  
  // Generate helper text based on entity type
  const getHelperText = (entityType: string) => {
    switch (entityType) {
      case 'artist':
        return "Enter artist name or IDs to sync";
      case 'venue':
        return "Enter venue name or Ticketmaster ID";
      case 'show':
        return "Enter show details";
      case 'song':
        return "Enter song details or Spotify ID";
      default:
        return "";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unified Sync Test</CardTitle>
        <CardDescription>
          Test the new unified sync function that replaces the previous multi-function orchestration system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="artist">Artist</SelectItem>
                        <SelectItem value="venue">Venue</SelectItem>
                        <SelectItem value="show">Show</SelectItem>
                        <SelectItem value="song">Song</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {getHelperText(form.watch('entityType'))}
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity ID (UUID)</FormLabel>
                    <FormControl>
                      <Input placeholder="UUID" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave blank to create new
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="entityName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist Name</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="Search artists..."
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleSearch(e.target.value);
                        }}
                      />
                    </FormControl>
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-background shadow-lg rounded-md border">
                        {searchResults.map((artist) => (
                          <div
                            key={artist.ticketmasterId}
                            className="p-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                            onClick={() => {
                              form.setValue('entityName', artist.name);
                              form.setValue('ticketmasterId', artist.ticketmasterId);
                              setSearchResults([]);
                            }}
                          >
                            {artist.imageUrl && (
                              <img
                                src={artist.imageUrl}
                                alt={artist.name}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span>{artist.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Start typing to search Ticketmaster artists
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="ticketmasterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticketmaster ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Ticketmaster ID" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="spotifyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spotify ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Spotify ID" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="forceRefresh"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Force Refresh</FormLabel>
                      <FormDescription>
                        Force API calls even if entity exists
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="skipDependencies"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Skip Dependencies</FormLabel>
                      <FormDescription>
                        Don't fetch related entities
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Start Sync"
              )}
            </Button>
          </form>
        </Form>
        
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sync Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto max-h-[500px] bg-muted p-4 rounded-md text-sm text-foreground">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
