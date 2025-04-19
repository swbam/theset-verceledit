/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Payload {
  userId: string;
  providerToken: string;
  limit?: number; // number of top artists to fetch
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, providerToken, limit = 20 } = (await req.json()) as Payload;

    if (!userId || !providerToken) {
      return new Response(
        JSON.stringify({ error: "userId and providerToken are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Fetch user's top artists from Spotify
    const spotifyResp = await fetch(
      `https://api.spotify.com/v1/me/top/artists?limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${providerToken}` },
      },
    );

    if (!spotifyResp.ok) {
      const txt = await spotifyResp.text();
      return new Response(
        JSON.stringify({ error: "Spotify API error", details: txt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: spotifyResp.status },
      );
    }

    const { items = [] } = await spotifyResp.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const followedArtistIds: string[] = [];

    for (const artist of items) {
      // Upsert artist into "artists" table keyed by spotify_id
      const artistData = {
        name: artist.name,
        image_url: artist.images?.[0]?.url ?? null,
        genres: artist.genres ?? [],
        popularity: artist.popularity ?? null,
        followers: artist.followers?.total ?? null,
        spotify_id: artist.id,
        spotify_url: artist.external_urls?.spotify ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: selErr } = await supabase
        .from("artists")
        .select("id")
        .eq("spotify_id", artist.id)
        .maybeSingle();

      if (selErr) {
        console.error("[spotify-sync] select error", selErr);
        continue;
      }

      let dbArtistId: string;
      if (existing) {
        dbArtistId = existing.id;
        const { error: updErr } = await supabase
          .from("artists")
          .update(artistData)
          .eq("id", dbArtistId);
        if (updErr) console.error("[spotify-sync] update artist", updErr);
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("artists")
          .insert(artistData)
          .select("id")
          .single();
        if (insErr) {
          console.error("[spotify-sync] insert artist", insErr);
          continue;
        }
        dbArtistId = ins.id;
      }

      followedArtistIds.push(dbArtistId);

      // Upsert into user_follows
      const { error: followErr } = await supabase
        .from("user_follows")
        .upsert({ user_id: userId, artist_id: dbArtistId }, { onConflict: "user_id,artist_id" });
      if (followErr) console.error("[spotify-sync] upsert follow", followErr);
    }

    return new Response(
      JSON.stringify({ success: true, artistIds: followedArtistIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[spotify-sync] Error", err);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
