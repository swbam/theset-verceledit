import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    // Get Ticketmaster event data
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${eventId}?apikey=${process.env.TICKETMASTER_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get Ticketmaster event data:', await response.text());
      return NextResponse.json(
        { error: 'Failed to fetch event data from Ticketmaster API' },
        { status: 500 }
      );
    }

    const eventData = await response.json();

    // Extract venue data if available
    const venue = eventData._embedded?.venues?.[0];
    let venueId = null;

    if (venue) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Upsert venue data
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .upsert({
          ticketmaster_id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.name,
          country: venue.country?.name,
          address: venue.address?.line1,
          postal_code: venue.postalCode,
          latitude: venue.location?.latitude,
          longitude: venue.location?.longitude,
          url: venue.url,
          image_url: venue.images?.[0]?.url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'ticketmaster_id',
          returning: 'minimal'
        })
        .select('id')
        .single();

      if (venueError) {
        console.error('Failed to upsert venue:', venueError);
      } else {
        venueId = venueData.id;
      }
    }

    return NextResponse.json({
      ...eventData,
      processedVenueId: venueId
    });
  } catch (error: any) {
    console.error('Error in Ticketmaster event API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred fetching Ticketmaster event data' },
      { status: 500 }
    );
  }
} 