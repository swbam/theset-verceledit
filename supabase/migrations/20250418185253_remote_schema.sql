create extension if not exists "pg_net" with schema "public" version '0.14.0';

drop policy "Public played setlist songs are viewable by everyone" on "public"."played_setlist_songs";

drop policy "Setlist raw data is insertable by authenticated users" on "public"."setlist_raw_data";

drop policy "Setlist raw data is viewable by authenticated users" on "public"."setlist_raw_data";

drop policy "All users can read songs" on "public"."songs";

drop policy "Allow inserting songs" on "public"."songs";

drop policy "Allow modifying songs" on "public"."songs";

drop policy "Allow reading songs" on "public"."songs";

drop policy "Allow updating songs" on "public"."songs";

drop policy "Songs are deletable by authenticated users" on "public"."songs";

drop policy "Songs are insertable by authenticated users" on "public"."songs";

drop policy "Songs are updatable by authenticated users" on "public"."songs";

drop policy "modify_authenticated" on "public"."songs";

drop policy "select_authenticated" on "public"."songs";

drop policy "All users can read votes" on "public"."votes";

drop policy "Allow inserting votes" on "public"."votes";

drop policy "Allow reading votes" on "public"."votes";

drop policy "Allow updating own votes" on "public"."votes";

drop policy "Authenticated users can insert votes" on "public"."votes";

drop policy "Users can manage their own votes" on "public"."votes";

revoke delete on table "public"."setlist_raw_data" from "authenticated";

revoke insert on table "public"."setlist_raw_data" from "authenticated";

revoke references on table "public"."setlist_raw_data" from "authenticated";

revoke select on table "public"."setlist_raw_data" from "authenticated";

revoke trigger on table "public"."setlist_raw_data" from "authenticated";

revoke truncate on table "public"."setlist_raw_data" from "authenticated";

revoke update on table "public"."setlist_raw_data" from "authenticated";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_setlist_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_show_id_key";

alter table "public"."setlist_songs" drop constraint "setlist_songs_song_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_pkey";

drop index if exists "public"."setlist_raw_data_pkey";

drop index if exists "public"."setlist_raw_data_show_id_key";

drop index if exists "public"."idx_sync_tasks_priority";

drop table "public"."setlist_raw_data";

create table "public"."audit_logs" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "action" text not null,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "metadata" jsonb,
    "ip_address" text,
    "created_at" timestamp with time zone default now()
);


create table "public"."rate_limits" (
    "id" uuid not null default uuid_generate_v4(),
    "key" text not null,
    "hits" integer default 1,
    "reset_at" timestamp with time zone not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."user_follows" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "artist_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_follows" enable row level security;

create table "public"."user_votes" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "song_id" uuid not null,
    "vote_type" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_votes" enable row level security;

alter table "public"."setlist_songs" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."setlist_songs" alter column "created_at" set not null;

alter table "public"."setlist_songs" alter column "position" set not null;

alter table "public"."setlist_songs" alter column "setlist_id" set not null;

alter table "public"."setlist_songs" alter column "song_id" set not null;

alter table "public"."setlist_songs" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."setlist_songs" alter column "updated_at" set not null;

alter table "public"."setlist_songs" enable row level security;

alter table "public"."sync_tasks" drop column "data";

alter table "public"."sync_tasks" drop column "entity_name";

alter table "public"."sync_tasks" alter column "dependencies" set default '{}'::text[];

alter table "public"."sync_tasks" alter column "priority" set default 0;

alter table "public"."sync_tasks" alter column "result" drop default;

alter table "public"."sync_tasks" alter column "status" drop default;

alter table "public"."venues" enable row level security;

alter table "public"."votes" alter column "show_id" set not null;

alter table "public"."votes" alter column "song_id" set not null;

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE INDEX idx_setlist_songs_order_index ON public.setlist_songs USING btree (order_index);

CREATE INDEX idx_setlist_songs_votes ON public.setlist_songs USING btree (votes DESC);

CREATE INDEX idx_sync_tasks_entity ON public.sync_tasks USING btree (entity_type, entity_id);

CREATE INDEX idx_user_votes_combined ON public.user_votes USING btree (user_id, song_id);

CREATE INDEX idx_user_votes_song_id ON public.user_votes USING btree (song_id);

CREATE INDEX idx_user_votes_user_id ON public.user_votes USING btree (user_id);

CREATE UNIQUE INDEX rate_limits_key_key ON public.rate_limits USING btree (key);

CREATE UNIQUE INDEX rate_limits_pkey ON public.rate_limits USING btree (id);

CREATE INDEX setlist_songs_position_idx ON public.setlist_songs USING btree ("position");

CREATE INDEX setlist_songs_setlist_id_idx ON public.setlist_songs USING btree (setlist_id);

CREATE UNIQUE INDEX setlist_songs_setlist_id_position_key ON public.setlist_songs USING btree (setlist_id, "position");

CREATE INDEX setlist_songs_song_id_idx ON public.setlist_songs USING btree (song_id);

CREATE INDEX songs_artist_id_idx ON public.songs USING btree (artist_id);

CREATE INDEX songs_popularity_idx ON public.songs USING btree (popularity DESC NULLS LAST);

CREATE INDEX songs_spotify_id_idx ON public.songs USING btree (spotify_id);

CREATE INDEX songs_vote_count_idx ON public.songs USING btree (vote_count DESC NULLS LAST);

CREATE UNIQUE INDEX sync_tasks_entity_type_entity_id_key ON public.sync_tasks USING btree (entity_type, entity_id);

CREATE UNIQUE INDEX user_follows_pkey ON public.user_follows USING btree (id);

CREATE UNIQUE INDEX user_follows_user_id_artist_id_key ON public.user_follows USING btree (user_id, artist_id);

CREATE UNIQUE INDEX user_votes_pkey ON public.user_votes USING btree (id);

CREATE UNIQUE INDEX user_votes_user_id_song_id_key ON public.user_votes USING btree (user_id, song_id);

CREATE INDEX votes_created_at_idx ON public.votes USING btree (created_at DESC);

CREATE INDEX votes_song_id_idx ON public.votes USING btree (song_id);

CREATE INDEX votes_user_id_idx ON public.votes USING btree (user_id);

CREATE INDEX idx_sync_tasks_priority ON public.sync_tasks USING btree (priority DESC, created_at);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."rate_limits" add constraint "rate_limits_pkey" PRIMARY KEY using index "rate_limits_pkey";

alter table "public"."user_follows" add constraint "user_follows_pkey" PRIMARY KEY using index "user_follows_pkey";

alter table "public"."user_votes" add constraint "user_votes_pkey" PRIMARY KEY using index "user_votes_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."rate_limits" add constraint "rate_limits_key_key" UNIQUE using index "rate_limits_key_key";

alter table "public"."setlist_songs" add constraint "setlist_songs_setlist_id_position_key" UNIQUE using index "setlist_songs_setlist_id_position_key";

alter table "public"."songs" add constraint "vote_count_non_negative" CHECK ((vote_count >= 0)) not valid;

alter table "public"."songs" validate constraint "vote_count_non_negative";

alter table "public"."sync_tasks" add constraint "sync_tasks_entity_type_check" CHECK ((entity_type = ANY (ARRAY['artist'::text, 'venue'::text, 'show'::text, 'setlist'::text, 'song'::text]))) not valid;

alter table "public"."sync_tasks" validate constraint "sync_tasks_entity_type_check";

alter table "public"."sync_tasks" add constraint "sync_tasks_entity_type_entity_id_key" UNIQUE using index "sync_tasks_entity_type_entity_id_key";

alter table "public"."sync_tasks" add constraint "sync_tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."sync_tasks" validate constraint "sync_tasks_status_check";

alter table "public"."user_follows" add constraint "user_follows_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE not valid;

alter table "public"."user_follows" validate constraint "user_follows_artist_id_fkey";

alter table "public"."user_follows" add constraint "user_follows_user_id_artist_id_key" UNIQUE using index "user_follows_user_id_artist_id_key";

alter table "public"."user_follows" add constraint "user_follows_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_follows" validate constraint "user_follows_user_id_fkey";

alter table "public"."user_votes" add constraint "user_votes_song_id_fkey" FOREIGN KEY (song_id) REFERENCES setlist_songs(id) not valid;

alter table "public"."user_votes" validate constraint "user_votes_song_id_fkey";

alter table "public"."user_votes" add constraint "user_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_votes" validate constraint "user_votes_user_id_fkey";

alter table "public"."user_votes" add constraint "user_votes_user_id_song_id_key" UNIQUE using index "user_votes_user_id_song_id_key";

alter table "public"."user_votes" add constraint "user_votes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['upvote'::text, 'downvote'::text]))) not valid;

alter table "public"."user_votes" validate constraint "user_votes_vote_type_check";

alter table "public"."votes" add constraint "votes_song_id_fkey" FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE not valid;

alter table "public"."votes" validate constraint "votes_song_id_fkey";

alter table "public"."setlist_songs" add constraint "setlist_songs_song_id_fkey" FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE not valid;

alter table "public"."setlist_songs" validate constraint "setlist_songs_song_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.call_orchestrate_sync()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  response RECORD;
  project_url TEXT;
  service_role_key TEXT;
BEGIN
  RAISE NOTICE 'Calling orchestrate-sync Edge Function';

  -- Get Supabase URL and Service Role Key from secrets
  BEGIN
    SELECT decrypted_secret INTO project_url FROM supabase.decrypted_secrets WHERE name = 'PROJECT_URL';
    SELECT decrypted_secret INTO service_role_key FROM supabase.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY';

    IF project_url IS NULL OR length(project_url) = 0 THEN
      RAISE NOTICE 'call_orchestrate_sync: PROJECT_URL secret is missing or empty';
      RETURN FALSE; -- Exit if URL is missing
    END IF;
    IF service_role_key IS NULL OR length(service_role_key) = 0 THEN
      RAISE NOTICE 'call_orchestrate_sync: SERVICE_ROLE_KEY secret is missing or empty';
      RETURN FALSE; -- Exit if key is missing
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'call_orchestrate_sync: Error retrieving secrets: %', SQLERRM;
    RETURN FALSE; -- Exit if secrets can't be retrieved
  END;

  -- Call the orchestrate-sync Edge Function
  SELECT * FROM net.http_post(
    url := project_url || '/functions/v1/orchestrate-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'operation', 'process',
      'limit', 10
    )
  ) INTO response;

  -- Check response status
  IF response.status >= 200 AND response.status < 300 THEN
    RAISE NOTICE 'Successfully called orchestrate-sync: %', response.body;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Error calling orchestrate-sync: % - %', response.status, response.body;
    RETURN FALSE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Exception calling orchestrate-sync: %', SQLERRM;
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window interval)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ DECLARE v_now TIMESTAMPTZ := now(); v_reset TIMESTAMPTZ; v_hits INTEGER; BEGIN DELETE FROM rate_limits WHERE reset_at < v_now; INSERT INTO rate_limits (key, reset_at) VALUES (p_key, v_now + p_window) ON CONFLICT (key) DO UPDATE SET hits = rate_limits.hits + 1, reset_at = CASE WHEN rate_limits.reset_at < v_now THEN v_now + p_window ELSE rate_limits.reset_at END RETURNING hits, reset_at INTO v_hits, v_reset; RETURN v_hits <= p_limit; END; $function$
;

CREATE OR REPLACE FUNCTION public.get_show_vote_counts()
 RETURNS TABLE(show_id uuid, vote_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as show_id,
    COALESCE(SUM(v.count), 0) as vote_count
  FROM shows s
  LEFT JOIN setlist_songs ss ON ss.setlist_id = s.id
  LEFT JOIN votes v ON v.song_id = ss.id
  GROUP BY s.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_sync_stats()
 RETURNS TABLE(entity_type text, total bigint, last_24h bigint, last_sync timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ BEGIN RETURN QUERY WITH sync_counts AS (SELECT ss.entity_type, COUNT(*) as total_count, COUNT(*) FILTER (WHERE ss.last_synced >= NOW() - INTERVAL '24 hours') as recent_count, MAX(ss.last_synced) as latest_sync FROM sync_states ss GROUP BY ss.entity_type) SELECT sc.entity_type::text, sc.total_count, sc.recent_count, sc.latest_sync FROM sync_counts sc ORDER BY sc.entity_type; END; $function$
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
      WHEN 'artist' THEN edge_function := 'sync-artist';
      WHEN 'show' THEN edge_function := 'sync-show';
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

    -- Prepare request body based on entity type (removed references to non-existent 'data' column)
    CASE task_record.entity_type
      WHEN 'artist' THEN request_body := jsonb_build_object('artistId', task_record.entity_id);
      WHEN 'show' THEN request_body := jsonb_build_object('showId', task_record.entity_id);
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

    RAISE NOTICE 'process_sync_tasks: Processing task % (%) - calling %',
                task_record.id, task_record.entity_type, edge_function; -- Removed entity_name

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
          updated_at = NOW(),
          completed_at = NOW(),
          result = response.body::jsonb
        WHERE id = task_record.id;

        RAISE NOTICE 'process_sync_tasks: Successfully processed task % (%)',
                    task_record.id, task_record.entity_type; -- Removed entity_name
      ELSE
        -- Update task as failed
        UPDATE public.sync_tasks
        SET
          status = 'failed',
          updated_at = NOW(),
          error = format('HTTP error %s: %s', response.status, response.body)
        WHERE id = task_record.id;

        RAISE NOTICE 'process_sync_tasks: Task % (%) failed with HTTP status %',
                    task_record.id, task_record.entity_type, response.status; -- Removed entity_name
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Update task as failed with error message
      UPDATE public.sync_tasks
      SET
        status = 'failed',
        updated_at = NOW(),
        error = SQLERRM
      WHERE id = task_record.id;

      RAISE NOTICE 'process_sync_tasks: Error processing task % (%): %',
                  task_record.id, task_record.entity_type, SQLERRM; -- Removed entity_name
    END;

    processed_count := processed_count + 1;
  END LOOP;

  RAISE NOTICE 'process_sync_tasks() completed. Processed % tasks', processed_count;
  RETURN processed_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_upcoming_shows()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  inserted_count INTEGER := 0;
  artist_record RECORD;
  venue_record RECORD;
  show_record RECORD;
  current_date TIMESTAMP WITH TIME ZONE := NOW();
  cutoff_date TIMESTAMP WITH TIME ZONE := current_date + INTERVAL '90 days';
  task_id UUID;
BEGIN
  -- Log function execution for debugging
  RAISE NOTICE 'sync_upcoming_shows() started at %', current_date;
  
  -- 1. Sync upcoming shows
  FOR show_record IN (
    SELECT s.id, s.name, s.ticketmaster_id, s.date
    FROM public.shows s
    WHERE s.date > current_date AND s.date < cutoff_date
    ORDER BY s.date ASC
    LIMIT 100
  ) LOOP
    -- Insert sync task for show
    INSERT INTO public.sync_tasks (
      entity_type, 
      entity_id, 
      status, 
      priority, 
      entity_name, 
      data
    ) VALUES (
      'show',
      show_record.id,
      'pending',
      CASE 
        WHEN show_record.date < current_date + INTERVAL '7 days' THEN 10 -- High priority for shows in next 7 days
        WHEN show_record.date < current_date + INTERVAL '30 days' THEN 5 -- Medium priority for shows in next 30 days
        ELSE 1 -- Low priority for shows further out
      END,
      show_record.name,
      jsonb_build_object('ticketmaster_id', show_record.ticketmaster_id)
    )
    ON CONFLICT (entity_type, entity_id) 
    DO NOTHING
    RETURNING id INTO task_id;
    
    IF task_id IS NOT NULL THEN
      inserted_count := inserted_count + 1;
      RAISE NOTICE 'Added sync task for show: % (%)', show_record.name, show_record.id;
    END IF;
  END LOOP;
  
  -- 2. Sync popular artists (those with shows)
  FOR artist_record IN (
    SELECT DISTINCT a.id, a.name, a.ticketmaster_id
    FROM public.artists a
    JOIN public.shows s ON s.artist_id = a.id
    WHERE s.date > current_date AND s.date < cutoff_date
    ORDER BY a.popularity DESC NULLS LAST
    LIMIT 50
  ) LOOP
    -- Insert sync task for artist
    INSERT INTO public.sync_tasks (
      entity_type, 
      entity_id, 
      status, 
      priority, 
      entity_name, 
      data
    ) VALUES (
      'artist',
      artist_record.id,
      'pending',
      5, -- Medium priority
      artist_record.name,
      jsonb_build_object('ticketmaster_id', artist_record.ticketmaster_id)
    )
    ON CONFLICT (entity_type, entity_id) 
    DO NOTHING
    RETURNING id INTO task_id;
    
    IF task_id IS NOT NULL THEN
      inserted_count := inserted_count + 1;
      RAISE NOTICE 'Added sync task for artist: % (%)', artist_record.name, artist_record.id;
    END IF;
  END LOOP;
  
  -- 3. Sync venues with upcoming shows
  FOR venue_record IN (
    SELECT DISTINCT v.id, v.name, v.ticketmaster_id
    FROM public.venues v
    JOIN public.shows s ON s.venue_id = v.id
    WHERE s.date > current_date AND s.date < cutoff_date
    LIMIT 50
  ) LOOP
    -- Insert sync task for venue
    INSERT INTO public.sync_tasks (
      entity_type, 
      entity_id, 
      status, 
      priority, 
      entity_name, 
      data
    ) VALUES (
      'venue',
      venue_record.id,
      'pending',
      3, -- Lower priority
      venue_record.name,
      jsonb_build_object('ticketmaster_id', venue_record.ticketmaster_id)
    )
    ON CONFLICT (entity_type, entity_id) 
    DO NOTHING
    RETURNING id INTO task_id;
    
    IF task_id IS NOT NULL THEN
      inserted_count := inserted_count + 1;
      RAISE NOTICE 'Added sync task for venue: % (%)', venue_record.name, venue_record.id;
    END IF;
  END LOOP;
  
  -- 4. If no tasks were created (empty database scenario), create a special task to fetch trending shows
  IF inserted_count = 0 THEN
    INSERT INTO public.sync_tasks (
      entity_type, 
      entity_id, 
      status, 
      priority, 
      entity_name, 
      data
    ) VALUES (
      'system',
      'fetch_trending',
      'pending',
      10, -- High priority
      'Fetch Trending Shows',
      '{"action": "fetch_trending_shows", "limit": 20}'
    )
    ON CONFLICT (entity_type, entity_id) 
    DO NOTHING
    RETURNING id INTO task_id;
    
    IF task_id IS NOT NULL THEN
      inserted_count := inserted_count + 1;
      RAISE NOTICE 'Added task to fetch trending shows';
    END IF;
  END IF;
  
  RAISE NOTICE 'sync_upcoming_shows() completed. Added % tasks', inserted_count;
  RETURN inserted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_song_vote_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE songs
    SET vote_count = COALESCE(vote_count, 0) + 1
    WHERE id = NEW.song_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE songs
    SET vote_count = GREATEST(COALESCE(vote_count, 0) - 1, 0)
    WHERE id = OLD.song_id;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_vote(p_song_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Lock the song row to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(hashtext(p_song_id::text));
  
  -- Update vote count
  UPDATE votes
  SET count = greatest(count - 1, 0)
  WHERE song_id = p_song_id AND user_id = p_user_id;
  
  -- Update the total vote count
  UPDATE setlist_songs
  SET vote_count = (
    SELECT COALESCE(SUM(count), 0)
    FROM votes
    WHERE song_id = p_song_id
  )
  WHERE id = p_song_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_vote(p_song_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Lock the song row to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(hashtext(p_song_id::text));
  
  -- Insert or update vote count
  INSERT INTO votes (song_id, user_id, count)
  VALUES (p_song_id, p_user_id, 1)
  ON CONFLICT (song_id, user_id) 
  DO UPDATE SET count = votes.count + 1;
  
  -- Update the total vote count
  UPDATE setlist_songs
  SET vote_count = (
    SELECT COALESCE(SUM(count), 0)
    FROM votes
    WHERE song_id = p_song_id
  )
  WHERE id = p_song_id;
END;
$function$
;

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."rate_limits" to "anon";

grant insert on table "public"."rate_limits" to "anon";

grant references on table "public"."rate_limits" to "anon";

grant select on table "public"."rate_limits" to "anon";

grant trigger on table "public"."rate_limits" to "anon";

grant truncate on table "public"."rate_limits" to "anon";

grant update on table "public"."rate_limits" to "anon";

grant delete on table "public"."rate_limits" to "authenticated";

grant insert on table "public"."rate_limits" to "authenticated";

grant references on table "public"."rate_limits" to "authenticated";

grant select on table "public"."rate_limits" to "authenticated";

grant trigger on table "public"."rate_limits" to "authenticated";

grant truncate on table "public"."rate_limits" to "authenticated";

grant update on table "public"."rate_limits" to "authenticated";

grant delete on table "public"."rate_limits" to "service_role";

grant insert on table "public"."rate_limits" to "service_role";

grant references on table "public"."rate_limits" to "service_role";

grant select on table "public"."rate_limits" to "service_role";

grant trigger on table "public"."rate_limits" to "service_role";

grant truncate on table "public"."rate_limits" to "service_role";

grant update on table "public"."rate_limits" to "service_role";

grant delete on table "public"."setlist_songs" to "anon";

grant insert on table "public"."setlist_songs" to "anon";

grant references on table "public"."setlist_songs" to "anon";

grant select on table "public"."setlist_songs" to "anon";

grant trigger on table "public"."setlist_songs" to "anon";

grant truncate on table "public"."setlist_songs" to "anon";

grant update on table "public"."setlist_songs" to "anon";

grant delete on table "public"."setlist_songs" to "authenticated";

grant insert on table "public"."setlist_songs" to "authenticated";

grant references on table "public"."setlist_songs" to "authenticated";

grant select on table "public"."setlist_songs" to "authenticated";

grant trigger on table "public"."setlist_songs" to "authenticated";

grant truncate on table "public"."setlist_songs" to "authenticated";

grant update on table "public"."setlist_songs" to "authenticated";

grant delete on table "public"."setlist_songs" to "service_role";

grant insert on table "public"."setlist_songs" to "service_role";

grant references on table "public"."setlist_songs" to "service_role";

grant select on table "public"."setlist_songs" to "service_role";

grant trigger on table "public"."setlist_songs" to "service_role";

grant truncate on table "public"."setlist_songs" to "service_role";

grant update on table "public"."setlist_songs" to "service_role";

grant delete on table "public"."sync_tasks" to "anon";

grant insert on table "public"."sync_tasks" to "anon";

grant references on table "public"."sync_tasks" to "anon";

grant select on table "public"."sync_tasks" to "anon";

grant trigger on table "public"."sync_tasks" to "anon";

grant truncate on table "public"."sync_tasks" to "anon";

grant update on table "public"."sync_tasks" to "anon";

grant delete on table "public"."sync_tasks" to "authenticated";

grant insert on table "public"."sync_tasks" to "authenticated";

grant references on table "public"."sync_tasks" to "authenticated";

grant select on table "public"."sync_tasks" to "authenticated";

grant trigger on table "public"."sync_tasks" to "authenticated";

grant truncate on table "public"."sync_tasks" to "authenticated";

grant update on table "public"."sync_tasks" to "authenticated";

grant delete on table "public"."sync_tasks" to "service_role";

grant insert on table "public"."sync_tasks" to "service_role";

grant references on table "public"."sync_tasks" to "service_role";

grant select on table "public"."sync_tasks" to "service_role";

grant trigger on table "public"."sync_tasks" to "service_role";

grant truncate on table "public"."sync_tasks" to "service_role";

grant update on table "public"."sync_tasks" to "service_role";

grant delete on table "public"."user_follows" to "anon";

grant insert on table "public"."user_follows" to "anon";

grant references on table "public"."user_follows" to "anon";

grant select on table "public"."user_follows" to "anon";

grant trigger on table "public"."user_follows" to "anon";

grant truncate on table "public"."user_follows" to "anon";

grant update on table "public"."user_follows" to "anon";

grant delete on table "public"."user_follows" to "authenticated";

grant insert on table "public"."user_follows" to "authenticated";

grant references on table "public"."user_follows" to "authenticated";

grant select on table "public"."user_follows" to "authenticated";

grant trigger on table "public"."user_follows" to "authenticated";

grant truncate on table "public"."user_follows" to "authenticated";

grant update on table "public"."user_follows" to "authenticated";

grant delete on table "public"."user_follows" to "service_role";

grant insert on table "public"."user_follows" to "service_role";

grant references on table "public"."user_follows" to "service_role";

grant select on table "public"."user_follows" to "service_role";

grant trigger on table "public"."user_follows" to "service_role";

grant truncate on table "public"."user_follows" to "service_role";

grant update on table "public"."user_follows" to "service_role";

grant delete on table "public"."user_votes" to "anon";

grant insert on table "public"."user_votes" to "anon";

grant references on table "public"."user_votes" to "anon";

grant select on table "public"."user_votes" to "anon";

grant trigger on table "public"."user_votes" to "anon";

grant truncate on table "public"."user_votes" to "anon";

grant update on table "public"."user_votes" to "anon";

grant delete on table "public"."user_votes" to "authenticated";

grant insert on table "public"."user_votes" to "authenticated";

grant references on table "public"."user_votes" to "authenticated";

grant select on table "public"."user_votes" to "authenticated";

grant trigger on table "public"."user_votes" to "authenticated";

grant truncate on table "public"."user_votes" to "authenticated";

grant update on table "public"."user_votes" to "authenticated";

grant delete on table "public"."user_votes" to "service_role";

grant insert on table "public"."user_votes" to "service_role";

grant references on table "public"."user_votes" to "service_role";

grant select on table "public"."user_votes" to "service_role";

grant trigger on table "public"."user_votes" to "service_role";

grant truncate on table "public"."user_votes" to "service_role";

grant update on table "public"."user_votes" to "service_role";

create policy "Authenticated users can add songs to setlists"
on "public"."setlist_songs"
as permissive
for insert
to authenticated
with check (true);


create policy "Authenticated users can delete setlist songs"
on "public"."setlist_songs"
as permissive
for delete
to authenticated
using (true);


create policy "Authenticated users can update setlist songs"
on "public"."setlist_songs"
as permissive
for update
to authenticated
using (true)
with check (true);


create policy "Enable voting for authenticated users"
on "public"."setlist_songs"
as permissive
for update
to authenticated
using (true)
with check (true);


create policy "Public setlist songs are viewable by everyone"
on "public"."setlist_songs"
as permissive
for select
to public
using (true);


create policy "Public setlist_songs are viewable by everyone"
on "public"."setlist_songs"
as permissive
for select
to public
using (true);


create policy "Setlist songs are viewable by everyone"
on "public"."setlist_songs"
as permissive
for select
to public
using (true);


create policy "Public sync_states are viewable by everyone"
on "public"."sync_states"
as permissive
for select
to public
using (true);


create policy "Authenticated users can view sync_tasks"
on "public"."sync_tasks"
as permissive
for select
to authenticated
using (true);


create policy "Service role can do everything with sync_tasks"
on "public"."sync_tasks"
as permissive
for all
to service_role
using (true);


create policy "Service role can do everything with user_follows"
on "public"."user_follows"
as permissive
for all
to service_role
using (true);


create policy "Users can delete their own follows"
on "public"."user_follows"
as permissive
for delete
to authenticated
using ((user_id = auth.uid()));


create policy "Users can insert their own follows"
on "public"."user_follows"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "Users can view their own follows"
on "public"."user_follows"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Users can update their own votes"
on "public"."user_votes"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view their own votes"
on "public"."user_votes"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Public venues are viewable by everyone"
on "public"."venues"
as permissive
for select
to public
using (true);


create policy "Users can create their own votes"
on "public"."votes"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own votes"
on "public"."votes"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own votes"
on "public"."votes"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Votes are viewable by everyone"
on "public"."votes"
as permissive
for select
to public
using (true);


CREATE TRIGGER update_song_vote_count_trigger AFTER INSERT OR DELETE ON public.votes FOR EACH ROW EXECUTE FUNCTION update_song_vote_count();


