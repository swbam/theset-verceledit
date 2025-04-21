

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_vote"("p_song_id" "uuid", "p_show_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_client_ip text;
  v_session_key text;
  v_updated boolean := false;
BEGIN
  -- Begin transaction to ensure atomicity
  BEGIN
    -- Get client IP for fingerprinting
    BEGIN
      v_client_ip := inet_client_addr()::text;
    EXCEPTION WHEN OTHERS THEN
      v_client_ip := 'unknown';
    END;
    
    -- Create a unique session key for this client+show combination
    v_session_key := encode(digest(v_client_ip || p_show_id::text || now()::text, 'sha256'), 'hex');
    
    -- Check if this client has already voted for this song in this show
    IF EXISTS (
      SELECT 1 FROM votes 
      WHERE song_id = p_song_id 
        AND show_id = p_show_id
        AND session_key = v_session_key
    ) THEN
      -- Already voted
      RETURN false;
    END IF;
    
    -- Insert the vote
    INSERT INTO votes (song_id, show_id, session_key, count)
    VALUES (p_song_id, p_show_id, v_session_key, 1);
    
    -- Update the vote count in the songs table
    UPDATE songs
    SET vote_count = COALESCE(vote_count, 0) + 1
    WHERE id = p_song_id
    RETURNING true INTO v_updated;
    
    -- Attempt to update setlist_songs if this song is in a setlist
    BEGIN
      UPDATE setlist_songs
      SET vote_count = COALESCE(vote_count, 0) + 1
      WHERE song_id = p_song_id AND setlist_id IN (
        SELECT id FROM setlists WHERE show_id = p_show_id
      );
      -- It's OK if this fails (song might not be in the setlist)
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue (non-critical)
      RAISE NOTICE 'Error updating setlist_songs vote count: %', SQLERRM;
    END;
    
    -- If this succeeds, commit the transaction
    RETURN COALESCE(v_updated, true);
  EXCEPTION WHEN OTHERS THEN
    -- If anything fails, log the error and return false
    RAISE NOTICE 'Error in add_vote function: %', SQLERRM;
    RETURN false;
  END;
END;
$$;


ALTER FUNCTION "public"."add_vote"("p_song_id" "uuid", "p_show_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_vote"("p_song_id" "uuid", "p_show_id" "uuid") IS 'Add a vote for a song at a specific show, using secure fingerprinting to prevent duplicate votes';



CREATE OR REPLACE FUNCTION "public"."begin_transaction"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Using EXECUTE to start a transaction
  EXECUTE 'BEGIN';
END;
$$;


ALTER FUNCTION "public"."begin_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."call_orchestrate_sync"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net'
    AS $$
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
$$;


ALTER FUNCTION "public"."call_orchestrate_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_key" "text", "p_limit" integer, "p_window" interval) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE v_now TIMESTAMPTZ := now(); v_reset TIMESTAMPTZ; v_hits INTEGER; BEGIN DELETE FROM rate_limits WHERE reset_at < v_now; INSERT INTO rate_limits (key, reset_at) VALUES (p_key, v_now + p_window) ON CONFLICT (key) DO UPDATE SET hits = rate_limits.hits + 1, reset_at = CASE WHEN rate_limits.reset_at < v_now THEN v_now + p_window ELSE rate_limits.reset_at END RETURNING hits, reset_at INTO v_hits, v_reset; RETURN v_hits <= p_limit; END; $$;


ALTER FUNCTION "public"."check_rate_limit"("p_key" "text", "p_limit" integer, "p_window" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_cache"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM api_cache WHERE expires_at < now();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sync_items"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.sync_queue
  WHERE (status = 'completed' OR status = 'failed')
    AND updated_at < NOW() - INTERVAL '7 days';
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_sync_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sync_operations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Delete sync operations older than 7 days
  DELETE FROM public.sync_operations
  WHERE started_at < NOW() - INTERVAL '7 days';
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_sync_operations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commit_transaction"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Using EXECUTE to commit a transaction
  EXECUTE 'COMMIT';
END;
$$;


ALTER FUNCTION "public"."commit_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_sync_item"("item_id" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.sync_queue
  SET 
    status = 'completed',
    updated_at = now(),
    processed_at = now()
  WHERE id = item_id
    AND status = 'processing';
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."complete_sync_item"("item_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sync_tables"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Create sync_states table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_states'
  ) THEN
    CREATE TABLE public.sync_states (
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      service_name TEXT,
      service_id TEXT,
      last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
      sync_version INTEGER DEFAULT 1,
      PRIMARY KEY (entity_id, entity_type)
    );
  END IF;
  
  -- Add service_name and service_id columns if they don't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_states'
    AND column_name = 'service_name'
  ) THEN
    ALTER TABLE public.sync_states ADD COLUMN service_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_states'
    AND column_name = 'service_id'
  ) THEN
    ALTER TABLE public.sync_states ADD COLUMN service_id TEXT;
  END IF;
  
  -- Create indexes if they don't exist
  IF NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'sync_states'
    AND indexname = 'idx_sync_states_entity_type'
  ) THEN
    CREATE INDEX idx_sync_states_entity_type ON public.sync_states (entity_type);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'sync_states'
    AND indexname = 'idx_sync_states_service_id'
  ) THEN
    CREATE INDEX idx_sync_states_service_id ON public.sync_states (service_id);
  END IF;
  
  -- Set up RLS
  ALTER TABLE public.sync_states ENABLE ROW LEVEL SECURITY;
  
  -- Create policies if they don't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'sync_states' 
    AND policyname = 'Allow reading sync states'
  ) THEN
    CREATE POLICY "Allow reading sync states"
    ON public.sync_states
    FOR SELECT
    TO authenticated, anon, service_role
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'sync_states' 
    AND policyname = 'Allow modifying sync states'
  ) THEN
    CREATE POLICY "Allow modifying sync states"
    ON public.sync_states
    FOR ALL
    TO service_role
    USING (true);
  END IF;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."create_sync_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_vote"("p_song_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- p_song_id is the ID of the setlist_song
  UPDATE votes
  SET count = greatest(count - 1, 0)
  WHERE song_id = p_song_id AND user_id = p_user_id;
  
  -- Update the vote count in the setlist_songs table
  UPDATE setlist_songs
  SET vote_count = greatest(vote_count - 1, 0)
  WHERE id = p_song_id;
END;
$$;


ALTER FUNCTION "public"."decrement_vote"("p_song_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_sync"("entity_type" "text", "external_id" "text", "reference_data" "jsonb" DEFAULT NULL::"jsonb", "priority" integer DEFAULT 5, "max_attempts" integer DEFAULT 3) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Call the new function with a default service name
  RETURN public.enqueue_sync(entity_type, 'ticketmaster', external_id, reference_data, priority, max_attempts);
END;
$$;


ALTER FUNCTION "public"."enqueue_sync"("entity_type" "text", "external_id" "text", "reference_data" "jsonb", "priority" integer, "max_attempts" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_sync"("entity_type" "text", "service_name" "text", "service_id" "text", "reference_data" "jsonb" DEFAULT NULL::"jsonb", "priority" integer DEFAULT 5, "max_attempts" integer DEFAULT 3) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_id INTEGER;
  new_id INTEGER;
BEGIN
  -- Check if there's already a pending or processing item for this entity
  SELECT id INTO existing_id
  FROM public.sync_queue
  WHERE entity_type = enqueue_sync.entity_type
    AND service_name = enqueue_sync.service_name
    AND service_id = enqueue_sync.service_id
    AND status IN ('pending', 'processing')
  LIMIT 1;
  
  IF existing_id IS NOT NULL THEN
    -- Item already in queue, return its ID
    RETURN existing_id;
  END IF;
  
  -- Insert new queue item
  INSERT INTO public.sync_queue(
    entity_type,
    service_name,
    service_id,
    reference_data,
    priority,
    max_attempts,
    status,
    attempts,
    created_at,
    updated_at
  )
  VALUES (
    entity_type,
    service_name,
    service_id,
    reference_data,
    priority,
    max_attempts,
    'pending',
    0,
    now(),
    now()
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_sync"("entity_type" "text", "service_name" "text", "service_id" "text", "reference_data" "jsonb", "priority" integer, "max_attempts" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  EXECUTE sql;
END;
$$;


ALTER FUNCTION "public"."exec_sql"("sql" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql_direct"("sql" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  EXECUTE sql;
END;
$$;


ALTER FUNCTION "public"."exec_sql_direct"("sql" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_sync_item"("item_id" integer, "error_message" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  item public.sync_queue;
BEGIN
  -- Get current attempts and max_attempts
  SELECT attempts, max_attempts INTO item
  FROM public.sync_queue
  WHERE id = item_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If reached max attempts, mark as failed, otherwise keep as pending for retry
  IF item.attempts >= item.max_attempts THEN
    UPDATE public.sync_queue
    SET 
      status = 'failed',
      error = error_message,
      updated_at = now()
    WHERE id = item_id;
  ELSE
    -- Keep as pending for future retry
    UPDATE public.sync_queue
    SET 
      status = 'pending',
      error = error_message,
      updated_at = now()
    WHERE id = item_id;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."fail_sync_item"("item_id" integer, "error_message" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."songs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "duration_ms" integer,
    "popularity" integer DEFAULT 0,
    "preview_url" "text",
    "vote_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "artist_id" "uuid",
    "album_name" "text",
    "album_image_url" "text",
    "spotify_id" "text",
    CONSTRAINT "vote_count_non_negative" CHECK (("vote_count" >= 0))
);


ALTER TABLE "public"."songs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_random_artist_songs"("artist_uuid" "uuid", "count" integer) RETURNS SETOF "public"."songs"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM songs
  WHERE artist_id = artist_uuid
  ORDER BY random()
  LIMIT count;
END;
$$;


ALTER FUNCTION "public"."get_random_artist_songs"("artist_uuid" "uuid", "count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_show_vote_counts"() RETURNS TABLE("show_id" "uuid", "vote_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_show_vote_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sync_stats"() RETURNS TABLE("entity_type" "text", "total" bigint, "last_24h" bigint, "last_sync" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN RETURN QUERY WITH sync_counts AS (SELECT ss.entity_type, COUNT(*) as total_count, COUNT(*) FILTER (WHERE ss.last_synced >= NOW() - INTERVAL '24 hours') as recent_count, MAX(ss.last_synced) as latest_sync FROM sync_states ss GROUP BY ss.entity_type) SELECT sc.entity_type::text, sc.total_count, sc.recent_count, sc.latest_sync FROM sync_counts sc ORDER BY sc.entity_type; END; $$;


ALTER FUNCTION "public"."get_sync_stats"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" integer DEFAULT 5,
    "dependencies" "uuid"[] DEFAULT '{}'::"uuid"[],
    "entity_name" "text",
    "data" "jsonb",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."sync_tasks" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sync_tasks"("p_status" "text" DEFAULT NULL::"text", "p_entity_type" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS SETOF "public"."sync_tasks"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.sync_tasks
  WHERE 
    (p_status IS NULL OR status = p_status) AND
    (p_entity_type IS NULL OR entity_type = p_entity_type)
  ORDER BY
    priority DESC,
    created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_sync_tasks"("p_status" "text", "p_entity_type" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_follows"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "artist_id" "uuid", "created_at" timestamp with time zone, "artist" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id,
    uf.user_id,
    uf.artist_id,
    uf.created_at,
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'image_url', a.image_url,
      'genres', a.genres
    ) AS artist
  FROM
    public.user_follows uf
    JOIN public.artists a ON uf.artist_id = a.id
  WHERE
    uf.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_follows"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_vote"("p_song_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- p_song_id is the ID of the setlist_song
  INSERT INTO votes (song_id, user_id, count)
  VALUES (p_song_id, p_user_id, 1)
  ON CONFLICT (song_id, user_id) DO UPDATE
  SET count = votes.count + 1;
  
  -- Update the vote count in the setlist_songs table
  UPDATE setlist_songs
  SET vote_count = vote_count + 1
  WHERE id = p_song_id;
END;
$$;


ALTER FUNCTION "public"."increment_vote"("p_song_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sync_queue"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-artist',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := (
      SELECT jsonb_agg(row_to_json(sq))
      FROM sync_queue sq
      WHERE status = 'pending'
      LIMIT 10
    )
  );
END;
$$;


ALTER FUNCTION "public"."process_sync_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sync_tasks"("p_limit" integer DEFAULT 5) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net'
    AS $$
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
$$;


ALTER FUNCTION "public"."process_sync_tasks"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rollback_transaction"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Using EXECUTE to rollback a transaction
  EXECUTE 'ROLLBACK';
END;
$$;


ALTER FUNCTION "public"."rollback_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_upcoming_shows"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_upcoming_shows"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_sync_system"("target_id" "text", "entity_type" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  result JSONB;
BEGIN
  -- Check if the entity exists in the appropriate table
  IF entity_type = 'song' THEN
    SELECT jsonb_build_object(
      'entity_exists', (SELECT COUNT(*) > 0 FROM songs WHERE id::text = target_id),
      'entity_data', CASE WHEN COUNT(*) > 0 THEN 
        jsonb_build_object(
          'id', id,
          'name', name,
          'artist_id', artist_id
        )
      ELSE NULL END
    ) INTO result
    FROM songs
    WHERE id::text = target_id;
  END IF;
  
  -- Check if a sync record exists
  SELECT 
    result || jsonb_build_object(
      'sync_record_exists', (SELECT COUNT(*) > 0 FROM sync_states WHERE entity_id = target_id AND entity_type = $2),
      'sync_data', (SELECT jsonb_build_object(
          'entity_id', entity_id,
          'entity_type', entity_type,
          'last_synced', last_synced,
          'sync_version', sync_version,
          'service_name', service_name,
          'service_id', service_id
        ) FROM sync_states WHERE entity_id = target_id AND entity_type = $2)
    ) INTO result;
  
  RETURN result;
END;
$_$;


ALTER FUNCTION "public"."test_sync_system"("target_id" "text", "entity_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_song_vote_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_song_vote_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."admins" IS 'Stores user IDs that have administrator privileges.';



CREATE TABLE IF NOT EXISTS "public"."api_cache" (
    "cache_key" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "provider" "text",
    "entity_type" "text",
    "entity_id" "uuid"
);


ALTER TABLE "public"."api_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artists" (
    "name" "text" NOT NULL,
    "image_url" "text",
    "followers" integer,
    "popularity" integer,
    "genres" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "url" "text",
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "stored_tracks" "jsonb",
    "spotify_id" "text",
    "setlist_fm_id" "text",
    "ticketmaster_id" "text",
    "setlist_fm_mbid" "text",
    "external_id" "text",
    "spotify_url" "text",
    "tm_id" "text"
);


ALTER TABLE "public"."artists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "metadata" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "error" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" integer NOT NULL,
    "name" "text",
    "sql" "text",
    "executed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migrations_id_seq" OWNED BY "public"."migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."played_setlist_songs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "setlist_id" "uuid",
    "song_id" "uuid",
    "position" integer,
    "is_encore" boolean DEFAULT false,
    "info" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."played_setlist_songs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "hits" integer DEFAULT 1,
    "reset_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setlist_raw_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "artist_id" "uuid",
    "show_id" "uuid",
    "setlist_id" "uuid",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."setlist_raw_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setlist_songs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "setlist_id" "uuid" NOT NULL,
    "song_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "votes" integer DEFAULT 0,
    "is_encore" boolean DEFAULT false,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "track_id" "uuid",
    "vote_count" integer DEFAULT 0,
    "artist_id" "uuid"
);


ALTER TABLE "public"."setlist_songs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone,
    "tour_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "artist_id" "uuid",
    "show_id" "uuid",
    "songs" "jsonb",
    "venue_id" "uuid",
    "setlist_fm_id" "text",
    "setlist_id" "text"
);


ALTER TABLE "public"."setlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shows" (
    "name" "text" NOT NULL,
    "date" timestamp with time zone,
    "image_url" "text",
    "ticket_url" "text",
    "url" "text",
    "status" "text",
    "popularity" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_updated" timestamp with time zone,
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "artist_id" "uuid",
    "venue_id" "uuid",
    "ticketmaster_id" "text",
    "external_id" "text"
);


ALTER TABLE "public"."shows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "sync_logs_entity_check" CHECK (("entity_type" = ANY (ARRAY['artist'::"text", 'show'::"text", 'setlist'::"text", 'venue'::"text", 'song'::"text"])))
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_states" (
    "entity_id" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "external_id" "text",
    "service_name" "text",
    "service_id" "text",
    "last_synced" timestamp with time zone DEFAULT "now"(),
    "sync_version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_states_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['artist'::"text", 'venue'::"text", 'show'::"text", 'song'::"text", 'setlist'::"text"])))
);


ALTER TABLE "public"."sync_states" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_states" IS 'Tracks sync state of entities across Edge Functions';



CREATE TABLE IF NOT EXISTS "public"."top_tracks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "album" "text",
    "album_id" "text",
    "spotify_id" "text",
    "duration_ms" integer,
    "popularity" integer DEFAULT 0,
    "preview_url" "text",
    "spotify_url" "text",
    "album_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."top_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "artist_id" "uuid",
    "name" "text" NOT NULL,
    "spotify_id" "text",
    "spotify_url" "text",
    "duration_ms" integer,
    "popularity" integer,
    "preview_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trending_shows_cache" (
    "rank" integer NOT NULL,
    "cached_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "show_id" "uuid" NOT NULL
);


ALTER TABLE "public"."trending_shows_cache" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."trending_shows_cache_rank_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."trending_shows_cache_rank_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."trending_shows_cache_rank_seq" OWNED BY "public"."trending_shows_cache"."rank";



CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "song_id" "uuid" NOT NULL,
    "vote_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_votes_vote_type_check" CHECK (("vote_type" = ANY (ARRAY['upvote'::"text", 'downvote'::"text"])))
);


ALTER TABLE "public"."user_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "name" "text" NOT NULL,
    "city" "text",
    "state" "text",
    "country" "text",
    "address" "text",
    "image_url" "text",
    "url" "text",
    "latitude" "text",
    "longitude" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "postal_code" "text",
    "ticketmaster_id" "text",
    "external_id" "text"
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "setlist_song_id" "uuid"
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."trending_shows_cache" ALTER COLUMN "rank" SET DEFAULT "nextval"('"public"."trending_shows_cache_rank_seq"'::"regclass");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."api_cache"
    ADD CONSTRAINT "api_cache_pkey" PRIMARY KEY ("cache_key");





ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_spotify_id_key" UNIQUE ("spotify_id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_ticketmaster_id_key" UNIQUE ("ticketmaster_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."played_setlist_songs"
    ADD CONSTRAINT "played_setlist_songs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."played_setlist_songs"
    ADD CONSTRAINT "played_setlist_songs_setlist_id_position_key" UNIQUE ("setlist_id", "position");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setlist_raw_data"
    ADD CONSTRAINT "setlist_raw_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setlist_raw_data"
    ADD CONSTRAINT "setlist_raw_data_show_id_key" UNIQUE ("show_id");



ALTER TABLE ONLY "public"."setlist_songs"
    ADD CONSTRAINT "setlist_songs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setlist_songs"
    ADD CONSTRAINT "setlist_songs_setlist_id_position_key" UNIQUE ("setlist_id", "position");



ALTER TABLE ONLY "public"."setlists"
    ADD CONSTRAINT "setlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setlists"
    ADD CONSTRAINT "setlists_setlist_fm_id_key" UNIQUE ("setlist_fm_id");



ALTER TABLE ONLY "public"."setlists"
    ADD CONSTRAINT "setlists_setlist_id_key" UNIQUE ("setlist_id");



ALTER TABLE ONLY "public"."shows"
    ADD CONSTRAINT "shows_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."shows"
    ADD CONSTRAINT "shows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shows"
    ADD CONSTRAINT "shows_ticketmaster_id_key" UNIQUE ("ticketmaster_id");



ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_spotify_id_key" UNIQUE ("spotify_id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_states"
    ADD CONSTRAINT "sync_states_pkey" PRIMARY KEY ("entity_id", "entity_type");



ALTER TABLE ONLY "public"."sync_tasks"
    ADD CONSTRAINT "sync_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_tracks"
    ADD CONSTRAINT "top_tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_tracks"
    ADD CONSTRAINT "top_tracks_spotify_id_key" UNIQUE ("spotify_id");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_spotify_id_key" UNIQUE ("spotify_id");



ALTER TABLE ONLY "public"."trending_shows_cache"
    ADD CONSTRAINT "trending_shows_cache_pkey" PRIMARY KEY ("show_id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_user_id_artist_id_key" UNIQUE ("user_id", "artist_id");



ALTER TABLE ONLY "public"."user_votes"
    ADD CONSTRAINT "user_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_votes"
    ADD CONSTRAINT "user_votes_user_id_song_id_key" UNIQUE ("user_id", "song_id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_external_id_unique" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_ticketmaster_id_key" UNIQUE ("ticketmaster_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_api_cache_lookup" ON "public"."api_cache" USING "btree" ("provider", "entity_type", "entity_id");



CREATE INDEX "idx_artists_external_id" ON "public"."artists" USING "btree" ("external_id");



CREATE INDEX "idx_artists_setlist_fm_id" ON "public"."artists" USING "btree" ("setlist_fm_id");



CREATE INDEX "idx_artists_spotify_id" ON "public"."artists" USING "btree" ("spotify_id");



CREATE INDEX "idx_artists_ticketmaster_id" ON "public"."artists" USING "btree" ("ticketmaster_id");



CREATE INDEX "idx_error_logs_endpoint" ON "public"."error_logs" USING "btree" ("endpoint");



CREATE INDEX "idx_error_logs_timestamp" ON "public"."error_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_played_setlist_songs_setlist_id" ON "public"."played_setlist_songs" USING "btree" ("setlist_id");



CREATE INDEX "idx_played_setlist_songs_song_id" ON "public"."played_setlist_songs" USING "btree" ("song_id");



CREATE INDEX "idx_setlist_songs_artist_id" ON "public"."setlist_songs" USING "btree" ("artist_id");



CREATE INDEX "idx_setlist_songs_setlist_id" ON "public"."setlist_songs" USING "btree" ("setlist_id");



CREATE INDEX "idx_setlist_songs_song_id" ON "public"."setlist_songs" USING "btree" ("song_id");



CREATE INDEX "idx_setlist_songs_vote_count" ON "public"."setlist_songs" USING "btree" ("vote_count" DESC);



CREATE INDEX "idx_setlist_songs_votes" ON "public"."setlist_songs" USING "btree" ("votes" DESC);



CREATE INDEX "idx_setlists_artist_id" ON "public"."setlists" USING "btree" ("artist_id");



CREATE INDEX "idx_setlists_setlist_fm_id" ON "public"."setlists" USING "btree" ("setlist_fm_id");



CREATE INDEX "idx_setlists_show_id" ON "public"."setlists" USING "btree" ("show_id");



CREATE INDEX "idx_shows_artist_id" ON "public"."shows" USING "btree" ("artist_id");



CREATE INDEX "idx_shows_external_id" ON "public"."shows" USING "btree" ("external_id");



CREATE INDEX "idx_shows_ticketmaster_id" ON "public"."shows" USING "btree" ("ticketmaster_id");



CREATE INDEX "idx_songs_spotify_id" ON "public"."songs" USING "btree" ("spotify_id");



CREATE INDEX "idx_sync_logs_lookup" ON "public"."sync_logs" USING "btree" ("entity_type", "entity_id", "provider");



CREATE INDEX "idx_sync_logs_status" ON "public"."sync_logs" USING "btree" ("status", "created_at");



CREATE INDEX "idx_sync_states_entity" ON "public"."sync_states" USING "btree" ("entity_id", "entity_type");



CREATE INDEX "idx_sync_tasks_created_at" ON "public"."sync_tasks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sync_tasks_entity" ON "public"."sync_tasks" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_sync_tasks_entity_id" ON "public"."sync_tasks" USING "btree" ("entity_id");



CREATE INDEX "idx_sync_tasks_entity_type" ON "public"."sync_tasks" USING "btree" ("entity_type");



CREATE INDEX "idx_sync_tasks_priority" ON "public"."sync_tasks" USING "btree" ("priority" DESC);



CREATE INDEX "idx_sync_tasks_status" ON "public"."sync_tasks" USING "btree" ("status");



CREATE INDEX "idx_sync_tasks_status_priority" ON "public"."sync_tasks" USING "btree" ("status", "priority" DESC);



CREATE INDEX "idx_top_tracks_artist_id" ON "public"."top_tracks" USING "btree" ("artist_id");



CREATE INDEX "idx_top_tracks_popularity" ON "public"."top_tracks" USING "btree" ("popularity" DESC);



CREATE INDEX "idx_top_tracks_spotify_id" ON "public"."top_tracks" USING "btree" ("spotify_id");



CREATE INDEX "idx_trending_shows_rank" ON "public"."trending_shows_cache" USING "btree" ("rank");



CREATE INDEX "idx_user_votes_combined" ON "public"."user_votes" USING "btree" ("user_id", "song_id");



CREATE INDEX "idx_user_votes_song_id" ON "public"."user_votes" USING "btree" ("song_id");



CREATE INDEX "idx_user_votes_user_id" ON "public"."user_votes" USING "btree" ("user_id");



CREATE INDEX "idx_venues_external_id" ON "public"."venues" USING "btree" ("external_id");



CREATE INDEX "idx_venues_ticketmaster_id" ON "public"."venues" USING "btree" ("ticketmaster_id");



CREATE INDEX "idx_votes_user_id" ON "public"."votes" USING "btree" ("user_id");



CREATE INDEX "setlist_songs_position_idx" ON "public"."setlist_songs" USING "btree" ("position");



CREATE INDEX "setlist_songs_setlist_id_idx" ON "public"."setlist_songs" USING "btree" ("setlist_id");



CREATE INDEX "setlist_songs_song_id_idx" ON "public"."setlist_songs" USING "btree" ("song_id");



CREATE INDEX "songs_artist_id_idx" ON "public"."songs" USING "btree" ("artist_id");



CREATE INDEX "songs_popularity_idx" ON "public"."songs" USING "btree" ("popularity" DESC NULLS LAST);



CREATE INDEX "songs_vote_count_idx" ON "public"."songs" USING "btree" ("vote_count" DESC NULLS LAST);



CREATE INDEX "votes_created_at_idx" ON "public"."votes" USING "btree" ("created_at" DESC);



CREATE INDEX "votes_user_id_idx" ON "public"."votes" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "artists_updated_at_trigger" BEFORE UPDATE ON "public"."artists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."setlists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."songs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "shows_updated_at_trigger" BEFORE UPDATE ON "public"."shows" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_songs_updated_at" BEFORE UPDATE ON "public"."songs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_setlists_updated_at" BEFORE UPDATE ON "public"."setlists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_song_vote_count_trigger" AFTER INSERT OR DELETE ON "public"."votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_song_vote_count"();



CREATE OR REPLACE TRIGGER "update_songs_updated_at" BEFORE UPDATE ON "public"."songs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_top_tracks_updated_at" BEFORE UPDATE ON "public"."top_tracks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_votes_updated_at" BEFORE UPDATE ON "public"."votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "venues_updated_at_trigger" BEFORE UPDATE ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."played_setlist_songs"
    ADD CONSTRAINT "played_setlist_songs_setlist_id_fkey" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlists"("id");



ALTER TABLE ONLY "public"."played_setlist_songs"
    ADD CONSTRAINT "played_setlist_songs_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."tracks"("id");



ALTER TABLE ONLY "public"."setlist_raw_data"
    ADD CONSTRAINT "setlist_raw_data_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."setlist_raw_data"
    ADD CONSTRAINT "setlist_raw_data_setlist_id_fkey" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlists"("id");



ALTER TABLE ONLY "public"."setlist_raw_data"
    ADD CONSTRAINT "setlist_raw_data_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id");



ALTER TABLE ONLY "public"."setlist_songs"
    ADD CONSTRAINT "setlist_songs_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."setlist_songs"
    ADD CONSTRAINT "setlist_songs_setlist_id_fkey" FOREIGN KEY ("setlist_id") REFERENCES "public"."setlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."setlist_songs"
    ADD CONSTRAINT "setlist_songs_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."setlists"
    ADD CONSTRAINT "setlists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."setlists"
    ADD CONSTRAINT "setlists_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."setlists"
    ADD CONSTRAINT "setlists_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id");



ALTER TABLE ONLY "public"."shows"
    ADD CONSTRAINT "shows_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shows"
    ADD CONSTRAINT "shows_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."top_tracks"
    ADD CONSTRAINT "top_tracks_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."tracks"
    ADD CONSTRAINT "tracks_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_votes"
    ADD CONSTRAINT "user_votes_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."setlist_songs"("id");



ALTER TABLE ONLY "public"."user_votes"
    ADD CONSTRAINT "user_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_setlist_song_id_fkey" FOREIGN KEY ("setlist_song_id") REFERENCES "public"."setlist_songs"("id");



CREATE POLICY "Admins can create sync tasks" ON "public"."sync_tasks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can update sync tasks" ON "public"."sync_tasks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view all sync tasks" ON "public"."sync_tasks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "All users can read artists" ON "public"."artists" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All users can read setlists" ON "public"."setlists" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All users can read shows" ON "public"."shows" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All users can read venues" ON "public"."venues" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to create artists" ON "public"."artists" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to create shows" ON "public"."shows" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to create venues" ON "public"."venues" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update artists" ON "public"."artists" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update shows" ON "public"."shows" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update venues" ON "public"."venues" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow full access to service_role" ON "public"."trending_shows_cache" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow public read access to artists" ON "public"."artists" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to shows" ON "public"."shows" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to venues" ON "public"."venues" FOR SELECT USING (true);



CREATE POLICY "Allow service role access to votes" ON "public"."votes" TO "service_role" USING (true);



CREATE POLICY "Authenticated users can add songs to setlists" ON "public"."setlist_songs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can delete setlist songs" ON "public"."setlist_songs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update setlist songs" ON "public"."setlist_songs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can vote" ON "public"."votes" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."played_setlist_songs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."played_setlist_songs" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."played_setlist_songs" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable voting for authenticated users" ON "public"."setlist_songs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Error logs are insertable by authenticated users" ON "public"."error_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Error logs are viewable by authenticated users" ON "public"."error_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public artists are viewable by everyone" ON "public"."artists" FOR SELECT USING (true);



CREATE POLICY "Public setlist songs are viewable by everyone" ON "public"."setlist_songs" FOR SELECT USING (true);



CREATE POLICY "Public setlist_songs are viewable by everyone" ON "public"."setlist_songs" FOR SELECT USING (true);



CREATE POLICY "Public setlists are viewable by everyone" ON "public"."setlists" FOR SELECT USING (true);



CREATE POLICY "Public shows are viewable by everyone" ON "public"."shows" FOR SELECT USING (true);



CREATE POLICY "Public venues are viewable by everyone" ON "public"."venues" FOR SELECT USING (true);



CREATE POLICY "Service role and anon can do all on artists" ON "public"."artists" TO "anon", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role and anon can do all on setlists" ON "public"."setlists" TO "anon", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role and anon can do all on shows" ON "public"."shows" TO "anon", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role and anon can do all on songs" ON "public"."songs" TO "anon", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role and anon can do all on venues" ON "public"."venues" TO "anon", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role and anon can do all on votes" ON "public"."votes" TO "anon", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything with user_follows" ON "public"."user_follows" TO "service_role" USING (true);



CREATE POLICY "Setlist songs are viewable by everyone" ON "public"."setlist_songs" FOR SELECT USING (true);



CREATE POLICY "Setlists are deletable by authenticated users" ON "public"."setlists" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Setlists are insertable by authenticated users" ON "public"."setlists" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Setlists are updatable by authenticated users" ON "public"."setlists" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Setlists are viewable by everyone" ON "public"."setlists" FOR SELECT USING (true);



CREATE POLICY "Songs are viewable by everyone" ON "public"."songs" FOR SELECT USING (true);



CREATE POLICY "Supabase service role can manage sync tasks" ON "public"."sync_tasks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Trending shows cache is viewable by everyone" ON "public"."trending_shows_cache" FOR SELECT USING (true);



CREATE POLICY "Users can create their own votes" ON "public"."votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own follows" ON "public"."user_follows" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own votes" ON "public"."votes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own follows" ON "public"."user_follows" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can modify their own votes" ON "public"."votes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own votes" ON "public"."user_votes" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own votes" ON "public"."votes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all votes" ON "public"."votes" FOR SELECT USING (true);



CREATE POLICY "Users can view their own follows" ON "public"."user_follows" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own votes" ON "public"."user_votes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Votes are viewable by everyone" ON "public"."votes" FOR SELECT USING (true);



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_cache_insert" ON "public"."api_cache" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "api_cache_select" ON "public"."api_cache" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."artists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."migrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modify_authenticated" ON "public"."setlists" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."played_setlist_songs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_authenticated" ON "public"."setlists" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."setlist_songs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."setlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trending_shows_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";



GRANT ALL ON FUNCTION "public"."add_vote"("p_song_id" "uuid", "p_show_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_vote"("p_song_id" "uuid", "p_show_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."exec_sql_direct"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql_direct"("sql" "text") TO "service_role";



GRANT ALL ON TABLE "public"."songs" TO "service_role";
GRANT ALL ON TABLE "public"."songs" TO "authenticated";
GRANT ALL ON TABLE "public"."songs" TO "anon";



GRANT ALL ON TABLE "public"."sync_tasks" TO "anon";
GRANT ALL ON TABLE "public"."sync_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."api_cache" TO "service_role";



GRANT ALL ON TABLE "public"."artists" TO "service_role";
GRANT ALL ON TABLE "public"."artists" TO "anon";
GRANT ALL ON TABLE "public"."artists" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."migrations" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."migrations_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."played_setlist_songs" TO "anon";
GRANT ALL ON TABLE "public"."played_setlist_songs" TO "authenticated";
GRANT ALL ON TABLE "public"."played_setlist_songs" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."setlist_raw_data" TO "anon";
GRANT ALL ON TABLE "public"."setlist_raw_data" TO "authenticated";
GRANT ALL ON TABLE "public"."setlist_raw_data" TO "service_role";



GRANT ALL ON TABLE "public"."setlist_songs" TO "anon";
GRANT ALL ON TABLE "public"."setlist_songs" TO "authenticated";
GRANT ALL ON TABLE "public"."setlist_songs" TO "service_role";



GRANT ALL ON TABLE "public"."setlists" TO "service_role";
GRANT ALL ON TABLE "public"."setlists" TO "authenticated";
GRANT ALL ON TABLE "public"."setlists" TO "anon";



GRANT ALL ON TABLE "public"."shows" TO "service_role";
GRANT ALL ON TABLE "public"."shows" TO "anon";
GRANT ALL ON TABLE "public"."shows" TO "authenticated";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."sync_states" TO "anon";
GRANT ALL ON TABLE "public"."sync_states" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_states" TO "service_role";



GRANT ALL ON TABLE "public"."top_tracks" TO "anon";
GRANT ALL ON TABLE "public"."top_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."top_tracks" TO "service_role";



GRANT ALL ON TABLE "public"."tracks" TO "anon";
GRANT ALL ON TABLE "public"."tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."tracks" TO "service_role";



GRANT ALL ON TABLE "public"."trending_shows_cache" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."trending_shows_cache_rank_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."trending_shows_cache_rank_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."trending_shows_cache_rank_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";



GRANT ALL ON TABLE "public"."user_votes" TO "anon";
GRANT ALL ON TABLE "public"."user_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_votes" TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "service_role";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";



GRANT ALL ON TABLE "public"."votes" TO "service_role";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";



RESET ALL;
