create extension if not exists "pg_net" with schema "public" version '0.14.0';

drop policy "All users can read artists" on "public"."artists";

drop policy "Allow authenticated users to create artists" on "public"."artists";

drop policy "Allow authenticated users to update artists" on "public"."artists";

drop policy "Public artists are viewable by everyone" on "public"."artists";

drop policy "Service role and anon can do all on artists" on "public"."artists";

drop policy "All users can read setlists" on "public"."setlists";

drop policy "Public setlists are viewable by everyone" on "public"."setlists";

drop policy "Service role and anon can do all on setlists" on "public"."setlists";

drop policy "Setlists are deletable by authenticated users" on "public"."setlists";

drop policy "Setlists are insertable by authenticated users" on "public"."setlists";

drop policy "Setlists are updatable by authenticated users" on "public"."setlists";

drop policy "Setlists are viewable by everyone" on "public"."setlists";

drop policy "modify_authenticated" on "public"."setlists";

drop policy "select_authenticated" on "public"."setlists";

drop policy "All users can read shows" on "public"."shows";

drop policy "Allow authenticated users to create shows" on "public"."shows";

drop policy "Allow authenticated users to update shows" on "public"."shows";

drop policy "Allow public read access to shows" on "public"."shows";

drop policy "Public shows are viewable by everyone" on "public"."shows";

drop policy "Service role and anon can do all on shows" on "public"."shows";

drop policy "enable_read_access_for_all" on "public"."shows";

drop policy "Allow service role access to votes" on "public"."votes";

drop policy "Authenticated users can vote" on "public"."votes";

drop policy "Service role and anon can do all on votes" on "public"."votes";

drop policy "Users can create their own votes" on "public"."votes";

drop policy "Users can delete their own votes" on "public"."votes";

drop policy "Users can modify their own votes" on "public"."votes";

drop policy "Users can update their own votes" on "public"."votes";

drop policy "Users can view all votes" on "public"."votes";

drop policy "Votes are viewable by everyone" on "public"."votes";

revoke delete on table "public"."offers" from "anon";

revoke insert on table "public"."offers" from "anon";

revoke references on table "public"."offers" from "anon";

revoke select on table "public"."offers" from "anon";

revoke trigger on table "public"."offers" from "anon";

revoke truncate on table "public"."offers" from "anon";

revoke update on table "public"."offers" from "anon";

revoke delete on table "public"."offers" from "authenticated";

revoke insert on table "public"."offers" from "authenticated";

revoke references on table "public"."offers" from "authenticated";

revoke select on table "public"."offers" from "authenticated";

revoke trigger on table "public"."offers" from "authenticated";

revoke truncate on table "public"."offers" from "authenticated";

revoke update on table "public"."offers" from "authenticated";

revoke delete on table "public"."offers" from "service_role";

revoke insert on table "public"."offers" from "service_role";

revoke references on table "public"."offers" from "service_role";

revoke select on table "public"."offers" from "service_role";

revoke trigger on table "public"."offers" from "service_role";

revoke truncate on table "public"."offers" from "service_role";

revoke update on table "public"."offers" from "service_role";

revoke delete on table "public"."promo_codes" from "anon";

revoke insert on table "public"."promo_codes" from "anon";

revoke references on table "public"."promo_codes" from "anon";

revoke select on table "public"."promo_codes" from "anon";

revoke trigger on table "public"."promo_codes" from "anon";

revoke truncate on table "public"."promo_codes" from "anon";

revoke update on table "public"."promo_codes" from "anon";

revoke delete on table "public"."promo_codes" from "authenticated";

revoke insert on table "public"."promo_codes" from "authenticated";

revoke references on table "public"."promo_codes" from "authenticated";

revoke select on table "public"."promo_codes" from "authenticated";

revoke trigger on table "public"."promo_codes" from "authenticated";

revoke truncate on table "public"."promo_codes" from "authenticated";

revoke update on table "public"."promo_codes" from "authenticated";

revoke delete on table "public"."promo_codes" from "service_role";

revoke insert on table "public"."promo_codes" from "service_role";

revoke references on table "public"."promo_codes" from "service_role";

revoke select on table "public"."promo_codes" from "service_role";

revoke trigger on table "public"."promo_codes" from "service_role";

revoke truncate on table "public"."promo_codes" from "service_role";

revoke update on table "public"."promo_codes" from "service_role";

alter table "public"."offers" drop constraint "offers_buyer_id_fkey";

alter table "public"."promo_codes" drop constraint "promo_codes_code_key";

drop function if exists "public"."call_orchestrate_sync"();

drop function if exists "public"."cleanup_sync_data"();

drop function if exists "public"."process_sync_queue"();

drop function if exists "public"."sync_pending_entities"();

drop function if exists "public"."sync_upcoming_shows"();

alter table "public"."offers" drop constraint "offers_pkey";

alter table "public"."promo_codes" drop constraint "promo_codes_pkey";

drop index if exists "public"."offers_pkey";

drop index if exists "public"."promo_codes_code_key";

drop index if exists "public"."promo_codes_pkey";

drop table "public"."offers";

drop table "public"."promo_codes";

alter table "public"."artists" add column "last_spotify_sync" timestamp with time zone;

alter table "public"."artists" add column "last_sync" timestamp with time zone;

alter table "public"."artists" add column "last_sync_error" text;

alter table "public"."artists" add column "last_ticketmaster_sync" timestamp with time zone;

alter table "public"."artists" add column "spotify_popularity" integer;

alter table "public"."artists" add column "stored_songs" jsonb;

alter table "public"."artists" add column "sync_status" jsonb default '{}'::jsonb;

alter table "public"."artists" add column "upcoming_shows_count" integer default 0;

alter table "public"."artists" alter column "ticketmaster_id" set not null;

alter table "public"."setlist_songs" alter column "song_id" drop not null;

alter table "public"."setlists" alter column "date" set data type date using "date"::date;

alter table "public"."shows" alter column "date" set data type date using "date"::date;

alter table "public"."songs" enable row level security;

CREATE INDEX artists_last_sync_idx ON public.artists USING btree (last_sync);

CREATE UNIQUE INDEX artists_setlist_fm_mbid_key ON public.artists USING btree (setlist_fm_mbid);

CREATE INDEX artists_spotify_id_idx ON public.artists USING btree (spotify_id);

CREATE UNIQUE INDEX artists_spotify_id_unique ON public.artists USING btree (spotify_id);

CREATE INDEX artists_ticketmaster_id_idx ON public.artists USING btree (ticketmaster_id);

CREATE UNIQUE INDEX artists_ticketmaster_id_unique ON public.artists USING btree (ticketmaster_id);

CREATE INDEX idx_artists_name ON public.artists USING btree (name);

CREATE INDEX idx_artists_stored_songs ON public.artists USING gin (stored_songs);

CREATE INDEX idx_artists_sync_times ON public.artists USING btree (last_ticketmaster_sync, last_spotify_sync);

CREATE INDEX idx_artists_updated_at ON public.artists USING btree (updated_at);

CREATE UNIQUE INDEX unique_spotify_id ON public.artists USING btree (spotify_id);

CREATE UNIQUE INDEX unique_ticketmaster_id ON public.artists USING btree (ticketmaster_id);

CREATE UNIQUE INDEX venues_ticketmaster_id_unique ON public.venues USING btree (ticketmaster_id);

alter table "public"."artists" add constraint "artists_setlist_fm_mbid_key" UNIQUE using index "artists_setlist_fm_mbid_key";

alter table "public"."artists" add constraint "artists_spotify_id_unique" UNIQUE using index "artists_spotify_id_unique";

alter table "public"."artists" add constraint "artists_ticketmaster_id_unique" UNIQUE using index "artists_ticketmaster_id_unique";

alter table "public"."artists" add constraint "unique_spotify_id" UNIQUE using index "unique_spotify_id";

alter table "public"."artists" add constraint "unique_ticketmaster_id" UNIQUE using index "unique_ticketmaster_id";

alter table "public"."artists" add constraint "validate_stored_tracks" CHECK (((stored_tracks IS NULL) OR (jsonb_typeof(stored_tracks) = 'array'::text))) not valid;

alter table "public"."artists" validate constraint "validate_stored_tracks";

alter table "public"."venues" add constraint "venues_ticketmaster_id_unique" UNIQUE using index "venues_ticketmaster_id_unique";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_random_songs(artist_id text, count integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  songs JSONB;
BEGIN
  SELECT stored_songs INTO songs
  FROM public.artists
  WHERE id = artist_id;

  IF songs IS NULL OR jsonb_array_length(songs) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN (
    SELECT jsonb_agg(song)
    FROM (
      SELECT song
      FROM jsonb_array_elements(songs) song
      ORDER BY random()
      LIMIT count
    ) s
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.manual_process_task(task_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  task_record RECORD;
  response JSONB;
  edge_function TEXT;
  request_body JSONB;
  artist_tm_id TEXT;
  project_url TEXT := 'https://kzjnkqeosrycfpxjwhil.supabase.co';
BEGIN
  -- Get task details
  SELECT * FROM sync_tasks WHERE id = task_id INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  -- Update task status to processing
  UPDATE sync_tasks SET status = 'processing', updated_at = NOW() WHERE id = task_id;
  
  -- Determine edge function to call
  CASE task_record.entity_type
    WHEN 'artist' THEN edge_function := 'sync-artist-v2';
    WHEN 'show' THEN edge_function := 'sync-show';
    WHEN 'show_by_artist' THEN edge_function := 'sync-artist-shows';
    ELSE edge_function := 'sync-artist-v2'; -- Default to sync-artist-v2
  END CASE;
  
  -- Prepare request body
  CASE task_record.entity_type
    WHEN 'artist' THEN request_body := jsonb_build_object('artistId', task_record.entity_id);
    WHEN 'show' THEN request_body := jsonb_build_object('showId', task_record.entity_id);
    WHEN 'show_by_artist' THEN
      SELECT ticketmaster_id INTO artist_tm_id FROM artists WHERE id = task_record.entity_id;
      request_body := jsonb_build_object(
        'artistId', task_record.entity_id,
        'ticketmasterId', artist_tm_id
      );
    ELSE request_body := jsonb_build_object('artistId', task_record.entity_id);
  END CASE;
  
  -- Add task ID
  request_body := request_body || jsonb_build_object('taskId', task_record.id);
  
  -- Add any additional data
  IF task_record.data IS NOT NULL AND NOT task_record.data = '{}'::jsonb THEN
    request_body := request_body || task_record.data;
  END IF;
  
  -- Task details
  RETURN jsonb_build_object(
    'task_id', task_record.id,
    'entity_type', task_record.entity_type,
    'entity_id', task_record.entity_id,
    'edge_function', edge_function,
    'request_body', request_body,
    'endpoint', project_url || '/functions/v1/' || edge_function
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_artist_dependent_tasks(artist_id uuid, artist_ticketmaster_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  show_task_id UUID;
BEGIN
  -- Queue a show sync task for this artist
  INSERT INTO sync_tasks (
    entity_type, 
    entity_id, 
    status, 
    priority, 
    dependencies, 
    entity_name, 
    data
  ) VALUES (
    'show_by_artist', 
    artist_id, 
    'pending', 
    5, 
    '{}', 
    NULL, 
    jsonb_build_object(
      'ticketmaster_id', artist_ticketmaster_id,
      'triggered_by', 'artist_sync',
      'auto_queued', true
    )
  )
  RETURNING id INTO show_task_id;
  
  -- Log the action
  INSERT INTO audit_logs (
    action, 
    entity_type, 
    entity_id, 
    metadata
  ) VALUES (
    'queue_dependent_task', 
    'artist', 
    artist_id, 
    jsonb_build_object(
      'dependent_task_id', show_task_id,
      'dependent_task_type', 'show_by_artist'
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_artist_last_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.last_sync = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_artist_upcoming_shows_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the artist's upcoming_shows_count when shows are modified
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.artists
    SET upcoming_shows_count = (
      SELECT COUNT(*)
      FROM public.shows
      WHERE artist_id = NEW.artist_id
      AND show_time > NOW()
    )
    WHERE id = NEW.artist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.artists
    SET upcoming_shows_count = (
      SELECT COUNT(*)
      FROM public.shows
      WHERE artist_id = OLD.artist_id
      AND show_time > NOW()
    )
    WHERE id = OLD.artist_id;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_sync_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Update Ticketmaster sync time if ticketmaster_id changed
    IF NEW.ticketmaster_id IS DISTINCT FROM OLD.ticketmaster_id THEN
      NEW.last_ticketmaster_sync = now();
    END IF;
    
    -- Update Spotify sync time if spotify_id or stored_tracks changed
    IF NEW.spotify_id IS DISTINCT FROM OLD.spotify_id OR 
       NEW.stored_tracks IS DISTINCT FROM OLD.stored_tracks THEN
      NEW.last_spotify_sync = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_stored_songs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.stored_songs IS NOT NULL AND jsonb_typeof(NEW.stored_songs) != 'array' THEN
    RAISE EXCEPTION 'stored_songs must be a JSONB array';
  END IF;
  
  -- Validate each song object has required fields
  IF NEW.stored_songs IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.stored_songs) song
      WHERE NOT (
        song ? 'id' AND 
        song ? 'name' AND 
        song ? 'duration_ms' AND 
        song ? 'popularity'
      )
    ) THEN
      RAISE EXCEPTION 'Each song must have id, name, duration_ms, and popularity fields';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_sync_tasks(p_limit integer DEFAULT 5)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  processed_count INTEGER := 0;
  task_record RECORD;
  project_url TEXT;
  service_role_key TEXT;
  response RECORD;
  edge_function TEXT;
  request_body JSONB;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  artist_tm_id TEXT;
BEGIN
  -- Log function execution for debugging
  RAISE NOTICE 'process_sync_tasks() started at %', current_time;

  -- Get Supabase URL and Service Role Key from secrets
  BEGIN
    SELECT decrypted_secret INTO project_url FROM supabase.decrypted_secrets WHERE name = 'PROJECT_URL';
    SELECT decrypted_secret INTO service_role_key FROM supabase.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY';

    IF project_url IS NULL OR length(project_url) = 0 THEN
      RAISE NOTICE 'process_sync_tasks: PROJECT_URL secret is missing or empty';
      RETURN 0; -- Exit if URL is missing
    END IF;
    IF service_role_key IS NULL OR length(service_role_key) = 0 THEN
      RAISE NOTICE 'process_sync_tasks: SERVICE_ROLE_KEY secret is missing or empty';
      RETURN 0; -- Exit if key is missing
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'process_sync_tasks: Error retrieving secrets: %', SQLERRM;
    RETURN 0; -- Exit if secrets can't be retrieved
  END;

  -- Process pending tasks
  FOR task_record IN (
    SELECT *
    FROM public.sync_tasks
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT p_limit
  ) LOOP
    -- Update task status to processing
    UPDATE public.sync_tasks
    SET
      status = 'processing',
      updated_at = current_time
    WHERE id = task_record.id;

    -- Determine which edge function to call based on entity_type
    CASE task_record.entity_type
      WHEN 'artist' THEN edge_function := 'sync-artist-v2';
      WHEN 'show' THEN edge_function := 'sync-show';
      WHEN 'show_by_artist' THEN edge_function := 'sync-artist-shows';
      WHEN 'venue' THEN edge_function := 'sync-venue';
      WHEN 'song' THEN edge_function := 'sync-song';
      WHEN 'setlist' THEN edge_function := 'sync-setlist';
      WHEN 'system' THEN
        IF task_record.entity_id = 'fetch_trending' THEN
          edge_function := 'fetch-trending';
        ELSE
          edge_function := 'orchestrate-sync';
        END IF;
      ELSE edge_function := 'orchestrate-sync'; -- Default fallback
    END CASE;

    -- Prepare request body based on entity type
    CASE task_record.entity_type
      WHEN 'artist' THEN request_body := jsonb_build_object('artistId', task_record.entity_id);
      WHEN 'show' THEN request_body := jsonb_build_object('showId', task_record.entity_id);
      WHEN 'show_by_artist' THEN 
        -- For show_by_artist, we need to get the ticketmaster_id of the artist
        SELECT ticketmaster_id INTO artist_tm_id FROM artists WHERE id = task_record.entity_id;
        request_body := jsonb_build_object(
          'artistId', task_record.entity_id,
          'ticketmasterId', artist_tm_id
        );
      WHEN 'venue' THEN request_body := jsonb_build_object('venueId', task_record.entity_id);
      WHEN 'song' THEN request_body := jsonb_build_object('songId', task_record.entity_id);
      WHEN 'setlist' THEN request_body := jsonb_build_object('setlistId', task_record.entity_id);
      WHEN 'system' THEN request_body := jsonb_build_object(); -- Assuming no specific data needed for system tasks now
      ELSE request_body := jsonb_build_object(
        'entityType', task_record.entity_type,
        'entityId', task_record.entity_id
      );
    END CASE;

    -- Add task ID to request body for tracking
    request_body := request_body || jsonb_build_object('taskId', task_record.id);
    
    -- Add data if it exists
    IF task_record.data IS NOT NULL AND NOT task_record.data = '{}'::jsonb THEN
      request_body := request_body || task_record.data;
    END IF;

    RAISE NOTICE 'process_sync_tasks: Processing task % (%) - calling %',
                task_record.id, task_record.entity_type, edge_function;

    -- Call the appropriate edge function
    BEGIN
      SELECT * FROM net.http_post(
        url := project_url || '/functions/v1/' || edge_function,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := request_body
      ) INTO response;

      -- Check response status
      IF response.status >= 200 AND response.status < 300 THEN
        -- Update task as completed
        UPDATE public.sync_tasks
        SET
          status = 'completed',
          updated_at = current_time,
          completed_at = current_time
        WHERE id = task_record.id;

        RAISE NOTICE 'process_sync_tasks: Successfully processed task % (%)',
                  task_record.id, task_record.entity_type;
      ELSE
        -- Update task as failed
        UPDATE public.sync_tasks
        SET
          status = 'failed',
          updated_at = current_time,
          error = format('HTTP Status %s: %s', 
                        response.status::text, 
                        SUBSTRING(response.body::text, 1, 500))
        WHERE id = task_record.id;
        
        RAISE NOTICE 'process_sync_tasks: Task % (%) failed with HTTP status %',
                  task_record.id, task_record.entity_type, response.status;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Update task as failed
      UPDATE public.sync_tasks
      SET
        status = 'failed',
        updated_at = current_time,
        error = SQLERRM
      WHERE id = task_record.id;
      
      RAISE NOTICE 'process_sync_tasks: Error processing task % (%): %',
                task_record.id, task_record.entity_type, SQLERRM;
    END;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RAISE NOTICE 'process_sync_tasks() completed. Processed % tasks', processed_count;
  RETURN processed_count;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'process_sync_tasks() error: %', SQLERRM;
  RETURN processed_count;
END;
$function$
;

create policy "Allow public read access"
on "public"."artists"
as permissive
for select
to public
using (true);


create policy "Allow service role full access"
on "public"."artists"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Allow service role to manage artists"
on "public"."artists"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Allow service_role full access"
on "public"."artists"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Enable read access for all users"
on "public"."artists"
as permissive
for select
to public
using (true);


create policy "Service role only"
on "public"."error_logs"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Allow service_role full access"
on "public"."setlists"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Enable read access for all users"
on "public"."setlists"
as permissive
for select
to public
using (true);


create policy "Allow service_role full access"
on "public"."shows"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Enable read access for all users"
on "public"."shows"
as permissive
for select
to public
using (true);


create policy "Allow public read access"
on "public"."songs"
as permissive
for select
to public
using (true);


create policy "Allow service role full access"
on "public"."songs"
as permissive
for all
to service_role
using (true);


create policy "Service role only"
on "public"."sync_logs"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Service role only"
on "public"."sync_tasks"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Allow public read access"
on "public"."venues"
as permissive
for select
to public
using (true);


create policy "Allow service role full access"
on "public"."venues"
as permissive
for all
to service_role
using (true);


create policy "Allow service_role full access"
on "public"."votes"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Allow users to manage their own votes"
on "public"."votes"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Enable read access for all users"
on "public"."votes"
as permissive
for select
to public
using (true);


CREATE TRIGGER set_artists_updated_at BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_artist_last_sync_trigger BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION update_artist_last_sync();

CREATE TRIGGER update_artist_sync_times BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION update_sync_timestamps();

CREATE TRIGGER validate_stored_songs_trigger BEFORE INSERT OR UPDATE OF stored_songs ON public.artists FOR EACH ROW EXECUTE FUNCTION validate_stored_songs();

CREATE TRIGGER update_artist_shows_count AFTER INSERT OR DELETE OR UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION update_artist_upcoming_shows_count();


