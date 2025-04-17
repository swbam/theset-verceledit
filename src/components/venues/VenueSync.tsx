import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useVenueSync } from '@/hooks/useVenueSync';

interface VenueSyncProps {
  venueId: string;
  venueName: string;
}

/**
 * VenueSync component that allows syncing all shows at a venue
 */
export default function VenueSync({ venueId, venueName }: VenueSyncProps) {
  // Use the refactored hook return values
  const { triggerVenueSync, isLoading, syncInitiated, error, clearError } = useVenueSync();
  const [expanded, setExpanded] = useState(false); // Keep local state for expansion

  const handleSync = async () => {
    clearError(); // Clear previous errors
    try { // Add missing opening brace
      const success = await triggerVenueSync(venueId, venueName); // Call the renamed function

      if (success) {
        toast.success(`Sync initiated for ${venueName}. Shows are being queued.`);
      // Optionally expand or show a different message based on syncInitiated
      setExpanded(true);
    } else {
      // Error state is handled by the hook, but we can add a generic toast
      toast.error(`Failed to initiate sync for ${venueName}.`);
      }
    // Correctly place the catch block after the try block
    } catch (err) {
      console.error('Error in handleSync:', err);
      // Error state is already set by the hook, but maybe add a generic toast?
      toast.error('An unexpected error occurred during sync initiation.');
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Venue Shows Sync</h3>
        <Button 
          onClick={handleSync} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All Shows
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-300 bg-red-50 text-red-800 mb-4">
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {/* Display message based on syncInitiated status */}
      {syncInitiated && !isLoading && !error && (
        <div className="space-y-3">
          <Card className="p-4 border-blue-300 bg-blue-50 text-blue-800">
            <p className="text-sm font-medium">
              Sync initiated for {venueName}. Related shows are being queued for background processing.
            </p>
            {/* Remove the details expansion for now as results are not directly returned */}
            {/* <div className="mt-2 flex items-center">
            </div> */}
          </Card>
          {/* Removed the detailed results display as the hook doesn't return them directly anymore */}
        </div>
      )}

    </div>
  );
}
