create extension if not exists "pg_net" with schema "public" version '0.14.0';

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_artist_data(artist_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE artists SET
    spotify_popularity = COALESCE((raw_data->>'popularity')::int, spotify_popularity),
    last_spotify_sync = NOW()
  FROM get_artist_spotify_data(artist_id) AS raw_data
  WHERE id = artist_id;

  UPDATE artists SET
    upcoming_shows_count = COALESCE((raw_data->>'count')::int, upcoming_shows_count),
    last_ticketmaster_sync = NOW()
  FROM get_artist_ticketmaster_data(artist_id) AS raw_data
  WHERE id = artist_id;

  INSERT INTO api_cache (cache_key, data, expires_at)
  VALUES ('artist_' || artist_id, jsonb_build_object('synced_at', NOW()), NOW() + INTERVAL '1 hour');
EXCEPTION WHEN others THEN
  INSERT INTO error_logs (endpoint, error) VALUES ('sync_artist_data', SQLERRM);
END;$function$
;

CREATE OR REPLACE FUNCTION public.sync_show_data(show_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE shows SET
    ticketmaster_id = COALESCE(raw_data->>'id', ticketmaster_id),
    status = COALESCE(raw_data->>'status', status),
    last_updated = NOW()
  FROM get_show_ticketmaster_data(show_id) AS raw_data
  WHERE id = show_id;

  INSERT INTO api_cache (cache_key, data, expires_at)
  VALUES ('show_' || show_id, jsonb_build_object('synced_at', NOW()), NOW() + INTERVAL '1 hour');
EXCEPTION WHEN others THEN
  INSERT INTO error_logs (endpoint, error) VALUES ('sync_show_data', SQLERRM);
END;$function$
;


