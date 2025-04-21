import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }

    // Get API key from environment variable
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error('TICKETMASTER_API_KEY not configured');
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }

    // Build Ticketmaster API URL
    const url = new URL(`https://app.ticketmaster.com/discovery/v2/${endpoint}`);
    url.searchParams.append('apikey', apiKey);

    // Forward all other query parameters
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        url.searchParams.append(key, value);
      }
    });

    console.log(`[API] Proxying Ticketmaster request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Ticketmaster API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Ticketmaster API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API] Error proxying Ticketmaster request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
