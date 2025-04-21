create extension if not exists "pg_trgm" with schema "public" version '1.6';

create sequence "public"."migrations_id_seq";

create sequence "public"."sync_queue_id_seq";

create sequence "public"."trending_shows_cache_rank_seq";

drop trigger if exists "update_artists_updated_at" on "public"."artists";

drop trigger if exists "update_setlist_songs_updated_at" on "public"."setlist_songs";

drop trigger if exists "update_shows_updated_at" on "public"."shows";

drop trigger if exists "update_top_tracks_updated_at" on "public"."top_tracks";

drop trigger if exists "update_venues_updated_at" on "public"."venues";

drop policy "Artists are deletable by authenticated users" on "public"."artists";

drop policy "Artists are insertable by authenticated users" on "public"."artists";

drop policy "Artists are updatable by authenticated users" on "public"."artists";

drop policy "Artists are viewable by everyone" on "public"."artists";

drop policy "Setlist songs are deletable by authenticated users" on "public"."setlist_songs";

drop policy "Setlist songs are insertable by authenticated users" on "public"."setlist_songs";

drop policy "Setlist songs are updatable by authenticated users" on "public"."setlist_songs";

drop policy "Setlist songs are viewable by everyone" on "public"."setlist_songs";

drop policy "Shows are deletable by authenticated users" on "public"."shows";

drop policy "Shows are insertable by authenticated users" on "public"."shows";

drop policy "Shows are updatable by authenticated users" on "public"."shows";

drop policy "Shows are viewable by everyone" on "public"."shows";

drop policy "Venues are deletable by authenticated users" on "public"."venues";

drop policy "Venues are insertable by authenticated users" on "public"."venues";

drop policy "Venues are updatable by authenticated users" on "public"."venues";

drop policy "Venues are viewable by everyone" on "public"."venues";

revoke select on table "public"."setlist_songs" from "anon";

revoke select on table "public"."setlist_songs" from "authenticated";

revoke delete on table "public"."setlist_songs" from "service_role";

revoke insert on table "public"."setlist_songs" from "service_role";

revoke references on table "public"."setlist_songs" from "service_role";

revoke select on table "public"."setlist_songs" from "service_role";

revoke trigger on table "public"."setlist_songs" from "service_role";

revoke truncate on table "public"."setlist_songs" from "service_role";

revoke update on table "public"."setlist_songs" from "service_role";

alter table "public"."api_cache" drop constraint "api_cache_endpoint_key";

alter table "public"."artists" drop constraint "artists_spotify_id_key";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_artist_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_show_id_fkey";

alter table "public"."setlist_songs" drop constraint "setlist_songs_artist_id_fkey";

alter table "public"."setlist_songs" drop constraint "setlist_songs_setlist_id_fkey";

alter table "public"."setlist_songs" drop constraint "setlist_songs_setlist_id_position_key";

alter table "public"."setlist_songs" drop constraint "setlist_songs_song_id_fkey";

alter table "public"."top_tracks" drop constraint "top_tracks_artist_id_fkey";

alter table "public"."top_tracks" drop constraint "top_tracks_spotify_id_key";

-- Safely drop venues_external_id_unique constraint if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'venues_external_id_unique'
    AND table_schema = 'public'
    AND table_name = 'venues'
  ) THEN
    alter table "public"."venues" drop constraint "venues_external_id_unique";
  END IF;
END $$;

alter table "public"."votes" drop constraint "votes_song_id_fkey";

alter table "public"."artists" drop constraint "artists_external_id_key";

alter table "public"."setlists" drop constraint "setlists_artist_id_fkey";

alter table "public"."setlists" drop constraint "setlists_show_id_fkey";

alter table "public"."shows" drop constraint "shows_artist_id_fkey";

alter table "public"."shows" drop constraint "shows_external_id_key";

alter table "public"."shows" drop constraint "shows_venue_id_fkey";

alter table "public"."songs" drop constraint "songs_artist_id_fkey";

drop function if exists "public"."decrement_vote"(song_id uuid, user_id uuid);

drop function if exists "public"."increment_vote"(song_id uuid, user_id uuid);

alter table "public"."setlist_songs" drop constraint "setlist_songs_pkey";

alter table "public"."top_tracks" drop constraint "top_tracks_pkey";

alter table "public"."api_cache" drop constraint "api_cache_pkey";

drop index if exists "public"."api_cache_endpoint_key";

drop index if exists "public"."artists_spotify_id_key";

drop index if exists "public"."idx_api_cache_endpoint";

drop index if exists "public"."idx_api_cache_expires";

drop index if exists "public"."idx_setlist_songs_artist_id";

drop index if exists "public"."idx_setlist_songs_setlist_id";

drop index if exists "public"."idx_setlist_songs_song_id";

drop index if exists "public"."idx_setlist_songs_vote_count";

drop index if exists "public"."idx_setlists_artist_id";

drop index if exists "public"."idx_setlists_show_id";

drop index if exists "public"."idx_shows_artist_id";

drop index if exists "public"."idx_shows_date";

drop index if exists "public"."idx_shows_venue_id";

drop index if exists "public"."idx_songs_artist_id";

drop index if exists "public"."idx_songs_artist_id_popularity";

drop index if exists "public"."idx_top_tracks_artist_id";

drop index if exists "public"."idx_top_tracks_popularity";

drop index if exists "public"."idx_top_tracks_spotify_id";

drop index if exists "public"."setlist_songs_pkey";

drop index if exists "public"."setlist_songs_setlist_id_position_key";

drop index if exists "public"."top_tracks_pkey";

drop index if exists "public"."top_tracks_spotify_id_key";

drop index if exists "public"."venues_external_id_unique";

drop index if exists "public"."api_cache_pkey";

drop index if exists "public"."artists_external_id_key";

drop index if exists "public"."idx_artists_external_id";

drop index if exists "public"."idx_shows_external_id";

drop index if exists "public"."shows_external_id_key";

drop table "public"."setlist_songs";

drop table "public"."top_tracks";

create table "public"."migrations" (
    "id" integer not null default nextval('migrations_id_seq'::regclass),
    "name" text,
    "sql" text,
    "executed_at" timestamp with time zone default now()
);


alter table "public"."migrations" enable row level security;

create table "public"."played_setlist_songs" (
    "id" uuid not null default gen_random_uuid(),
    "setlist_id" uuid not null,
    "song_id" uuid not null,
    "position" integer not null,
    "is_encore" boolean not null default false,
    "info" text,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."sync_operations" (
    "id" uuid not null default gen_random_uuid(),
    "task" text not null,
    "entity_type" text not null,
    "entity_id" text not null,
    "parent_task" text,
    "priority" text default 'medium'::text,
    "status" text default 'pending'::text,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "error" text
);


alter table "public"."sync_operations" enable row level security;

create table "public"."sync_queue" (
    "id" integer not null default nextval('sync_queue_id_seq'::regclass),
    "external_id" text not null,
    "entity_type" text not null,
    "operation" text not null,
    "attempts" integer not null default 0,
    "payload" jsonb,
    "created_at" timestamp with time zone default now(),
    "status" text not null default 'pending'::text,
    "reference_data" jsonb,
    "max_attempts" integer not null default 3,
    "processed_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now(),
    "error" text,
    "priority" integer default 3
);


alter table "public"."sync_queue" enable row level security;

create table "public"."sync_states" (
    "entity_id" text not null,
    "entity_type" text not null,
    "last_synced" timestamp with time zone not null default now(),
    "sync_version" integer not null default 1,
    "external_id" text
);


alter table "public"."sync_states" enable row level security;

create table "public"."trending_shows_cache" (
    "rank" integer not null default nextval('trending_shows_cache_rank_seq'::regclass),
    "cached_at" timestamp with time zone not null default now(),
    "show_id" uuid not null
);


alter table "public"."trending_shows_cache" enable row level security;

alter table "public"."api_cache" drop column "endpoint";

alter table "public"."api_cache" drop column "id";

alter table "public"."api_cache" add column "cache_key" text not null;

alter table "public"."api_cache" enable row level security;

alter table "public"."artists" add column "setlist_fm_id" text;

alter table "public"."artists" add column "tm_id" text;

alter table "public"."artists" alter column "followers" drop default;

alter table "public"."artists" disable row level security;

alter table "public"."setlist_raw_data" drop column "updated_at";

alter table "public"."setlists" disable row level security;

alter table "public"."shows" add column "last_updated" timestamp with time zone;

alter table "public"."shows" add column "status" text;

alter table "public"."shows" add column "tm_id" text;

alter table "public"."shows" add column "url" text;

alter table "public"."shows" alter column "popularity" drop default;

alter table "public"."shows" disable row level security;

alter table "public"."songs" add column "album_image_url" text;

alter table "public"."songs" add column "album_name" text;

alter table "public"."songs" disable row level security;

alter table "public"."venues" add column "address" text;

alter table "public"."venues" add column "latitude" text;

alter table "public"."venues" add column "longitude" text;

alter table "public"."venues" add column "postal_code" text;

alter table "public"."venues" add column "url" text;

alter table "public"."venues" disable row level security;

alter table "public"."votes" add column "show_id" uuid;

alter sequence "public"."migrations_id_seq" owned by "public"."migrations"."id";

alter sequence "public"."sync_queue_id_seq" owned by "public"."sync_queue"."id";

alter sequence "public"."trending_shows_cache_rank_seq" owned by "public"."trending_shows_cache"."rank";

CREATE UNIQUE INDEX artists_external_id_key1 ON public.artists USING btree (external_id);

CREATE UNIQUE INDEX artists_setlist_fm_id_unique_idx ON public.artists USING btree (setlist_fm_id) WHERE (setlist_fm_id IS NOT NULL);

CREATE UNIQUE INDEX artists_setlist_fm_mbid_unique_idx ON public.artists USING btree (setlist_fm_mbid) WHERE (setlist_fm_mbid IS NOT NULL);

CREATE UNIQUE INDEX artists_spotify_id_unique_idx ON public.artists USING btree (spotify_id) WHERE (spotify_id IS NOT NULL);

CREATE UNIQUE INDEX artists_tm_id_unique_idx ON public.artists USING btree (tm_id) WHERE (tm_id IS NOT NULL);

CREATE INDEX idx_played_setlist_songs_setlist_id ON public.played_setlist_songs USING btree (setlist_id);

CREATE INDEX idx_played_setlist_songs_song_id ON public.played_setlist_songs USING btree (song_id);

CREATE INDEX idx_sync_operations_entity ON public.sync_operations USING btree (entity_type, entity_id);

CREATE INDEX idx_sync_operations_started_at ON public.sync_operations USING btree (started_at);

CREATE INDEX idx_sync_operations_status ON public.sync_operations USING btree (status);

CREATE INDEX idx_sync_queue_status_priority ON public.sync_queue USING btree (status, priority, created_at) WHERE (status = 'pending'::text);

CREATE INDEX idx_sync_states_entity_type ON public.sync_states USING btree (entity_type);

CREATE INDEX idx_sync_states_external_id ON public.sync_states USING btree (external_id);

CREATE INDEX idx_trending_shows_rank ON public.trending_shows_cache USING btree (rank);

CREATE UNIQUE INDEX migrations_pkey ON public.migrations USING btree (id);

CREATE UNIQUE INDEX played_setlist_songs_pkey ON public.played_setlist_songs USING btree (id);

CREATE UNIQUE INDEX played_setlist_songs_setlist_id_position_key ON public.played_setlist_songs USING btree (setlist_id, "position");

CREATE UNIQUE INDEX played_setlist_songs_song_unique_per_setlist ON public.played_setlist_songs USING btree (setlist_id, song_id);

CREATE UNIQUE INDEX played_setlist_songs_unique ON public.played_setlist_songs USING btree (setlist_id, "position");

CREATE UNIQUE INDEX setlist_raw_data_show_id_key ON public.setlist_raw_data USING btree (show_id);

CREATE UNIQUE INDEX setlists_setlist_fm_id_unique_idx ON public.setlists USING btree (setlist_fm_id) WHERE (setlist_fm_id IS NOT NULL);

CREATE UNIQUE INDEX shows_tm_id_unique_idx ON public.shows USING btree (tm_id) WHERE (tm_id IS NOT NULL);

CREATE UNIQUE INDEX songs_spotify_id_unique_idx ON public.songs USING btree (spotify_id) WHERE (spotify_id IS NOT NULL);

CREATE UNIQUE INDEX sync_operations_pkey ON public.sync_operations USING btree (id);

CREATE INDEX sync_queue_entity_idx ON public.sync_queue USING btree (external_id, entity_type);

CREATE UNIQUE INDEX sync_queue_pkey ON public.sync_queue USING btree (id);

CREATE INDEX sync_states_entity_type_idx ON public.sync_states USING btree (entity_type);

CREATE INDEX sync_states_last_synced_idx ON public.sync_states USING btree (last_synced);

CREATE UNIQUE INDEX sync_states_pkey ON public.sync_states USING btree (entity_id, entity_type);

CREATE UNIQUE INDEX trending_shows_cache_pkey ON public.trending_shows_cache USING btree (show_id);

CREATE UNIQUE INDEX api_cache_pkey ON public.api_cache USING btree (cache_key);

CREATE UNIQUE INDEX artists_external_id_key ON public.artists USING btree (tm_id);

CREATE INDEX idx_artists_external_id ON public.artists USING btree (tm_id);

CREATE INDEX idx_shows_external_id ON public.shows USING btree (tm_id);

CREATE UNIQUE INDEX shows_external_id_key ON public.shows USING btree (tm_id);

alter table "public"."migrations" add constraint "migrations_pkey" PRIMARY KEY using index "migrations_pkey";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_pkey" PRIMARY KEY using index "played_setlist_songs_pkey";

alter table "public"."sync_operations" add constraint "sync_operations_pkey" PRIMARY KEY using index "sync_operations_pkey";

alter table "public"."sync_queue" add constraint "sync_queue_pkey" PRIMARY KEY using index "sync_queue_pkey";

alter table "public"."sync_states" add constraint "sync_states_pkey" PRIMARY KEY using index "sync_states_pkey";

alter table "public"."trending_shows_cache" add constraint "trending_shows_cache_pkey" PRIMARY KEY using index "trending_shows_cache_pkey";

alter table "public"."api_cache" add constraint "api_cache_pkey" PRIMARY KEY using index "api_cache_pkey";

alter table "public"."artists" add constraint "artists_external_id_key1" UNIQUE using index "artists_external_id_key1";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_setlist_id_fkey" FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE not valid;

alter table "public"."played_setlist_songs" validate constraint "played_setlist_songs_setlist_id_fkey";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_setlist_id_position_key" UNIQUE using index "played_setlist_songs_setlist_id_position_key";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_song_id_fkey" FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE RESTRICT not valid;

alter table "public"."played_setlist_songs" validate constraint "played_setlist_songs_song_id_fkey";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_song_unique_per_setlist" UNIQUE using index "played_setlist_songs_song_unique_per_setlist";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_unique" UNIQUE using index "played_setlist_songs_unique";

alter table "public"."setlist_raw_data" add constraint "setlist_raw_data_show_id_key" UNIQUE using index "setlist_raw_data_show_id_key";

alter table "public"."sync_operations" add constraint "valid_status" CHECK ((status = ANY (ARRAY['pending'::text, 'started'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."sync_operations" validate constraint "valid_status";

alter table "public"."sync_queue" add constraint "sync_queue_valid_status" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."sync_queue" validate constraint "sync_queue_valid_status";

alter table "public"."votes" add constraint "votes_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL not valid;

alter table "public"."votes" validate constraint "votes_show_id_fkey";

alter table "public"."artists" add constraint "artists_external_id_key" UNIQUE using index "artists_external_id_key";

alter table "public"."setlists" add constraint "setlists_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL not valid;

alter table "public"."setlists" validate constraint "setlists_artist_id_fkey";

alter table "public"."setlists" add constraint "setlists_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL not valid;

alter table "public"."setlists" validate constraint "setlists_show_id_fkey";

alter table "public"."shows" add constraint "shows_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL not valid;

alter table "public"."shows" validate constraint "shows_artist_id_fkey";

alter table "public"."shows" add constraint "shows_external_id_key" UNIQUE using index "shows_external_id_key";

alter table "public"."shows" add constraint "shows_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL not valid;

alter table "public"."shows" validate constraint "shows_venue_id_fkey";

alter table "public"."songs" add constraint "songs_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL not valid;

alter table "public"."songs" validate constraint "songs_artist_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_vote(p_song_id uuid, p_show_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.begin_transaction()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Using EXECUTE to start a transaction
  EXECUTE 'BEGIN';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_next_sync_item()
 RETURNS SETOF sync_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  item public.sync_queue;
BEGIN
  -- Get the highest priority item
  SELECT * INTO item
  FROM public.sync_queue
  WHERE status = 'pending'
    AND attempts < max_attempts
  ORDER BY priority ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF FOUND THEN
    -- Update the item to processing
    UPDATE public.sync_queue
    SET 
      status = 'processing',
      attempts = attempts + 1,
      updated_at = now()
    WHERE id = item.id
    RETURNING * INTO item;
    
    RETURN NEXT item;
  END IF;
  
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_sync_items()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM public.sync_queue
  WHERE (status = 'completed' OR status = 'failed')
    AND updated_at < NOW() - INTERVAL '7 days';
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_sync_operations()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Delete sync operations older than 7 days
  DELETE FROM public.sync_operations
  WHERE started_at < NOW() - INTERVAL '7 days';
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.commit_transaction()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Using EXECUTE to commit a transaction
  EXECUTE 'COMMIT';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_sync_item(item_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_sync_tables()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      external_id TEXT,
      last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
      sync_version INTEGER DEFAULT 1,
      PRIMARY KEY (entity_id, entity_type)
    );
  END IF;
  
  -- Add external_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sync_states'
    AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.sync_states ADD COLUMN external_id TEXT;
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
    AND indexname = 'idx_sync_states_external_id'
  ) THEN
    CREATE INDEX idx_sync_states_external_id ON public.sync_states (external_id);
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
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_vote(p_song_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE votes
  SET count = greatest(count - 1, 0)
  WHERE song_id = p_song_id AND user_id = p_user_id;
  
  UPDATE setlist_songs
  SET vote_count = greatest(vote_count - 1, 0)
  WHERE id = p_song_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_sync(entity_type text, external_id text, reference_data jsonb DEFAULT NULL::jsonb, priority integer DEFAULT 3, max_attempts integer DEFAULT 3)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  existing_id INTEGER;
  new_id INTEGER;
BEGIN
  -- Check if there's already a pending or processing item for this entity
  SELECT id INTO existing_id
  FROM public.sync_queue
  WHERE entity_type = enqueue_sync.entity_type
    AND external_id = enqueue_sync.external_id
    AND status IN ('pending', 'processing')
  LIMIT 1;
  
  IF existing_id IS NOT NULL THEN
    -- Item already in queue, return its ID
    RETURN existing_id;
  END IF;
  
  -- Insert new queue item
  INSERT INTO public.sync_queue(
    entity_type,
    external_id,
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
    external_id,
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
$function$
;

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.exec_sql_direct(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fail_sync_item(item_id integer, error_message text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.increment_vote(p_song_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO votes (song_id, user_id, count)
  VALUES (p_song_id, p_user_id, 1)
  ON CONFLICT (song_id, user_id) DO UPDATE
  SET count = votes.count + 1;
  
  UPDATE setlist_songs
  SET vote_count = vote_count + 1
  WHERE id = p_song_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rollback_transaction()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Using EXECUTE to rollback a transaction
  EXECUTE 'ROLLBACK';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_sync_system(target_id text, entity_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          'external_id', external_id
        ) FROM sync_states WHERE entity_id = target_id AND entity_type = $2)
    ) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."artists" to "anon";

grant insert on table "public"."artists" to "anon";

grant references on table "public"."artists" to "anon";

grant trigger on table "public"."artists" to "anon";

grant truncate on table "public"."artists" to "anon";

grant update on table "public"."artists" to "anon";

grant delete on table "public"."artists" to "authenticated";

grant insert on table "public"."artists" to "authenticated";

grant references on table "public"."artists" to "authenticated";

grant trigger on table "public"."artists" to "authenticated";

grant truncate on table "public"."artists" to "authenticated";

grant update on table "public"."artists" to "authenticated";

grant delete on table "public"."setlists" to "anon";

grant insert on table "public"."setlists" to "anon";

grant references on table "public"."setlists" to "anon";

grant trigger on table "public"."setlists" to "anon";

grant truncate on table "public"."setlists" to "anon";

grant update on table "public"."setlists" to "anon";

grant delete on table "public"."setlists" to "authenticated";

grant insert on table "public"."setlists" to "authenticated";

grant references on table "public"."setlists" to "authenticated";

grant trigger on table "public"."setlists" to "authenticated";

grant truncate on table "public"."setlists" to "authenticated";

grant update on table "public"."setlists" to "authenticated";

grant delete on table "public"."shows" to "anon";

grant insert on table "public"."shows" to "anon";

grant references on table "public"."shows" to "anon";

grant trigger on table "public"."shows" to "anon";

grant truncate on table "public"."shows" to "anon";

grant update on table "public"."shows" to "anon";

grant delete on table "public"."shows" to "authenticated";

grant insert on table "public"."shows" to "authenticated";

grant references on table "public"."shows" to "authenticated";

grant trigger on table "public"."shows" to "authenticated";

grant truncate on table "public"."shows" to "authenticated";

grant update on table "public"."shows" to "authenticated";

grant delete on table "public"."songs" to "anon";

grant insert on table "public"."songs" to "anon";

grant references on table "public"."songs" to "anon";

grant trigger on table "public"."songs" to "anon";

grant truncate on table "public"."songs" to "anon";

grant update on table "public"."songs" to "anon";

grant delete on table "public"."songs" to "authenticated";

grant insert on table "public"."songs" to "authenticated";

grant references on table "public"."songs" to "authenticated";

grant trigger on table "public"."songs" to "authenticated";

grant truncate on table "public"."songs" to "authenticated";

grant update on table "public"."songs" to "authenticated";

grant delete on table "public"."venues" to "anon";

grant insert on table "public"."venues" to "anon";

grant references on table "public"."venues" to "anon";

grant trigger on table "public"."venues" to "anon";

grant truncate on table "public"."venues" to "anon";

grant update on table "public"."venues" to "anon";

grant delete on table "public"."venues" to "authenticated";

grant insert on table "public"."venues" to "authenticated";

grant references on table "public"."venues" to "authenticated";

grant trigger on table "public"."venues" to "authenticated";

grant truncate on table "public"."venues" to "authenticated";

grant update on table "public"."venues" to "authenticated";

grant delete on table "public"."votes" to "anon";

grant insert on table "public"."votes" to "anon";

grant references on table "public"."votes" to "anon";

grant select on table "public"."votes" to "anon";

grant trigger on table "public"."votes" to "anon";

grant truncate on table "public"."votes" to "anon";

grant update on table "public"."votes" to "anon";

grant delete on table "public"."votes" to "authenticated";

grant insert on table "public"."votes" to "authenticated";

grant references on table "public"."votes" to "authenticated";

grant trigger on table "public"."votes" to "authenticated";

grant truncate on table "public"."votes" to "authenticated";

grant update on table "public"."votes" to "authenticated";

create policy "api_cache_insert"
on "public"."api_cache"
as permissive
for insert
to authenticated
with check (true);


create policy "api_cache_select"
on "public"."api_cache"
as permissive
for select
to authenticated
using (true);


create policy "All users can read artists"
on "public"."artists"
as permissive
for select
to authenticated
using (true);


create policy "Allow authenticated users to create artists"
on "public"."artists"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow authenticated users to update artists"
on "public"."artists"
as permissive
for update
to authenticated
using (true);


create policy "Allow public read access to artists"
on "public"."artists"
as permissive
for select
to public
using (true);


create policy "Service role and anon can do all on artists"
on "public"."artists"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "All users can read setlists"
on "public"."setlists"
as permissive
for select
to authenticated
using (true);


create policy "Service role and anon can do all on setlists"
on "public"."setlists"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "modify_authenticated"
on "public"."setlists"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "select_authenticated"
on "public"."setlists"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "All users can read shows"
on "public"."shows"
as permissive
for select
to authenticated
using (true);


create policy "Allow authenticated users to create shows"
on "public"."shows"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow authenticated users to update shows"
on "public"."shows"
as permissive
for update
to authenticated
using (true);


create policy "Allow public read access to shows"
on "public"."shows"
as permissive
for select
to public
using (true);


create policy "Service role and anon can do all on shows"
on "public"."shows"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "All users can read songs"
on "public"."songs"
as permissive
for select
to authenticated
using (true);


create policy "Allow inserting songs"
on "public"."songs"
as permissive
for insert
to authenticated, service_role
with check (true);


create policy "Allow modifying songs"
on "public"."songs"
as permissive
for all
to authenticated, service_role
using (true)
with check (true);


create policy "Allow reading songs"
on "public"."songs"
as permissive
for select
to authenticated, anon
using (true);


create policy "Allow updating songs"
on "public"."songs"
as permissive
for update
to authenticated, service_role
using (true)
with check (true);


create policy "Service role and anon can do all on songs"
on "public"."songs"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "modify_authenticated"
on "public"."songs"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "select_authenticated"
on "public"."songs"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Allow read access to sync operations"
on "public"."sync_operations"
as permissive
for select
to authenticated
using (true);


create policy "Allow write access to sync operations"
on "public"."sync_operations"
as permissive
for all
to service_role
using (true);


create policy "Allow read access to sync queue"
on "public"."sync_queue"
as permissive
for select
to authenticated
using (true);


create policy "Allow write access to sync queue"
on "public"."sync_queue"
as permissive
for all
to service_role
using (true);


create policy "sync_queue_all"
on "public"."sync_queue"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "sync_queue_select"
on "public"."sync_queue"
as permissive
for select
to authenticated
using (true);


create policy "Allow modifying sync states"
on "public"."sync_states"
as permissive
for all
to authenticated, service_role
using (true)
with check (true);


create policy "Allow reading sync states"
on "public"."sync_states"
as permissive
for select
to authenticated, anon, service_role
using (true);


create policy "sync_states_all"
on "public"."sync_states"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "sync_states_select"
on "public"."sync_states"
as permissive
for select
to authenticated
using (true);


create policy "Allow full access to service_role"
on "public"."trending_shows_cache"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Trending shows cache is viewable by everyone"
on "public"."trending_shows_cache"
as permissive
for select
to public
using (true);


create policy "All users can read venues"
on "public"."venues"
as permissive
for select
to authenticated
using (true);


create policy "Allow authenticated users to create venues"
on "public"."venues"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow authenticated users to update venues"
on "public"."venues"
as permissive
for update
to authenticated
using (true);


create policy "Allow public read access to venues"
on "public"."venues"
as permissive
for select
to public
using (true);


create policy "Service role and anon can do all on venues"
on "public"."venues"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "All users can read votes"
on "public"."votes"
as permissive
for select
to authenticated
using (true);


create policy "Allow inserting votes"
on "public"."votes"
as permissive
for insert
to authenticated, anon
with check (true);


create policy "Allow reading votes"
on "public"."votes"
as permissive
for select
to authenticated, anon
using (true);


create policy "Allow service role access to votes"
on "public"."votes"
as permissive
for all
to service_role
using (true);


create policy "Allow updating own votes"
on "public"."votes"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "Authenticated users can insert votes"
on "public"."votes"
as permissive
for insert
to authenticated
with check (true);


create policy "Service role and anon can do all on votes"
on "public"."votes"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "Users can manage their own votes"
on "public"."votes"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


CREATE TRIGGER artists_updated_at_trigger BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.setlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shows_updated_at_trigger BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_cleanup_sync_operations AFTER INSERT ON public.sync_operations FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_sync_operations();

CREATE TRIGGER trigger_cleanup_sync_queue AFTER INSERT ON public.sync_queue FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_sync_items();

CREATE TRIGGER venues_updated_at_trigger BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


