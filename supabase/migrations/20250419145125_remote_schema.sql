create extension if not exists "pg_net" with schema "public" version '0.14.0';

create sequence "public"."sync_queue_id_seq";

drop policy "Enable insert for authenticated users only" on "public"."played_setlist_songs";

drop policy "Enable read access for all users" on "public"."played_setlist_songs";

drop policy "Enable update for authenticated users only" on "public"."played_setlist_songs";

drop policy "Allow modifying sync states" on "public"."sync_states";

drop policy "Allow reading sync states" on "public"."sync_states";

drop policy "Public sync_states are viewable by everyone" on "public"."sync_states";

drop policy "sync_states_all" on "public"."sync_states";

drop policy "sync_states_select" on "public"."sync_states";

drop policy "Admins can create sync tasks" on "public"."sync_tasks";

drop policy "Admins can update sync tasks" on "public"."sync_tasks";

drop policy "Admins can view all sync tasks" on "public"."sync_tasks";

drop policy "Authenticated users can view sync_tasks" on "public"."sync_tasks";

drop policy "Service role can do everything with sync_tasks" on "public"."sync_tasks";

alter table "public"."artists" drop constraint "artists_external_id_key";

alter table "public"."artists" drop constraint "artists_external_id_key1";

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_setlist_id_fkey";

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_setlist_id_position_key";

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_song_id_fkey";

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_song_unique_per_setlist";

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_unique";

alter table "public"."setlists" drop constraint "setlists_setlist_id_key";

alter table "public"."shows" drop constraint "shows_external_id_key";

alter table "public"."sync_tasks" drop constraint "sync_tasks_entity_type_check";

alter table "public"."sync_tasks" drop constraint "sync_tasks_entity_type_entity_id_key";

alter table "public"."sync_tasks" drop constraint "sync_tasks_status_check";

alter table "public"."votes" drop constraint "votes_show_id_fkey";

alter table "public"."votes" drop constraint "votes_song_id_fkey";

alter table "public"."votes" drop constraint "votes_song_id_user_id_key";

drop function if exists "public"."get_sync_tasks"(p_status text, p_entity_type text, p_limit integer, p_offset integer);

drop function if exists "public"."enqueue_sync"(entity_type text, external_id text, reference_data jsonb, priority integer, max_attempts integer);

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_pkey";

drop index if exists "public"."artists_external_id_key";

drop index if exists "public"."artists_external_id_key1";

drop index if exists "public"."artists_setlist_fm_id_unique_idx";

drop index if exists "public"."artists_setlist_fm_mbid_unique_idx";

drop index if exists "public"."artists_spotify_id_unique_idx";

drop index if exists "public"."artists_tm_id_unique_idx";

drop index if exists "public"."idx_artists_external_id";

drop index if exists "public"."idx_played_setlist_songs_setlist_id";

drop index if exists "public"."idx_played_setlist_songs_song_id";

drop index if exists "public"."idx_setlist_songs_order_index";

drop index if exists "public"."idx_setlist_songs_spotify_id";

drop index if exists "public"."idx_shows_external_id";

drop index if exists "public"."idx_sync_states_entity";

drop index if exists "public"."idx_sync_states_entity_type";

drop index if exists "public"."idx_sync_states_external_id";

drop index if exists "public"."idx_sync_tasks_created_at";

drop index if exists "public"."idx_sync_tasks_entity_id";

drop index if exists "public"."idx_sync_tasks_entity_type";

drop index if exists "public"."idx_sync_tasks_priority";

drop index if exists "public"."idx_sync_tasks_status";

drop index if exists "public"."idx_venues_external_id";

drop index if exists "public"."idx_votes_song_id";

drop index if exists "public"."played_setlist_songs_pkey";

drop index if exists "public"."played_setlist_songs_setlist_id_position_key";

drop index if exists "public"."played_setlist_songs_song_unique_per_setlist";

drop index if exists "public"."played_setlist_songs_unique";

drop index if exists "public"."setlists_setlist_fm_id_unique_idx";

drop index if exists "public"."setlists_setlist_id_key";

drop index if exists "public"."shows_external_id_key";

drop index if exists "public"."shows_tm_id_unique_idx";

drop index if exists "public"."songs_spotify_id_idx";

drop index if exists "public"."songs_spotify_id_unique_idx";

drop index if exists "public"."sync_states_entity_type_idx";

drop index if exists "public"."sync_states_last_synced_idx";

drop index if exists "public"."sync_tasks_entity_type_entity_id_key";

drop index if exists "public"."votes_song_id_idx";

drop index if exists "public"."votes_song_id_user_id_key";

drop table "public"."played_setlist_songs";

create table "public"."sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "entity_id" uuid not null,
    "entity_type" text not null,
    "provider" text not null,
    "status" text not null,
    "error" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
);


create table "public"."sync_queue" (
    "id" integer not null default nextval('sync_queue_id_seq'::regclass),
    "entity_type" text not null,
    "external_id" text,
    "service_name" text,
    "service_id" text,
    "reference_data" jsonb,
    "priority" integer default 5,
    "max_attempts" integer default 3,
    "status" text default 'pending'::text,
    "attempts" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."sync_queue" enable row level security;

alter table "public"."api_cache" add column "entity_id" uuid;

alter table "public"."api_cache" add column "entity_type" text;

alter table "public"."api_cache" add column "provider" text;

alter table "public"."artists" drop column "external_id";

alter table "public"."artists" drop column "setlist_fm_mbid";

alter table "public"."artists" drop column "spotify_url";

alter table "public"."artists" drop column "tm_id";

alter table "public"."setlist_songs" drop column "name";

alter table "public"."setlist_songs" drop column "order_index";

alter table "public"."setlist_songs" drop column "spotify_id";

alter table "public"."setlist_songs" add column "is_encore" boolean default false;

alter table "public"."setlists" drop column "setlist_id";

alter table "public"."setlists" drop column "venue";

alter table "public"."setlists" drop column "venue_city";

alter table "public"."setlists" add column "songs" jsonb;

alter table "public"."setlists" add column "venue_id" uuid;

alter table "public"."setlists" alter column "id" set default gen_random_uuid();

alter table "public"."shows" drop column "external_id";

alter table "public"."shows" drop column "tm_id";

alter table "public"."sync_states" add column "service_id" text;

alter table "public"."sync_states" add column "service_name" text;

alter table "public"."sync_states" alter column "last_synced" drop not null;

alter table "public"."sync_states" alter column "sync_version" drop not null;

alter table "public"."sync_states" disable row level security;

alter table "public"."sync_tasks" drop column "result";

alter table "public"."sync_tasks" add column "data" jsonb;

alter table "public"."sync_tasks" add column "entity_name" text;

alter table "public"."sync_tasks" alter column "dependencies" set default '{}'::uuid[];

alter table "public"."sync_tasks" alter column "dependencies" set data type uuid[] using "dependencies"::uuid[];

alter table "public"."sync_tasks" alter column "entity_id" set data type uuid using "entity_id"::uuid;

alter table "public"."sync_tasks" alter column "priority" set default 5;

alter table "public"."sync_tasks" alter column "status" set default 'pending'::text;

alter table "public"."venues" drop column "external_id";

alter table "public"."votes" drop column "show_id";

alter table "public"."votes" drop column "song_id";

alter table "public"."votes" add column "setlist_song_id" uuid;

alter sequence "public"."sync_queue_id_seq" owned by "public"."sync_queue"."id";

CREATE UNIQUE INDEX artists_spotify_id_key ON public.artists USING btree (spotify_id);

CREATE INDEX idx_api_cache_lookup ON public.api_cache USING btree (provider, entity_type, entity_id);

CREATE INDEX idx_artists_setlist_fm_id ON public.artists USING btree (setlist_fm_id);

CREATE INDEX idx_sync_logs_lookup ON public.sync_logs USING btree (entity_type, entity_id, provider);

CREATE INDEX idx_sync_logs_status ON public.sync_logs USING btree (status, created_at);

CREATE UNIQUE INDEX sync_logs_pkey ON public.sync_logs USING btree (id);

CREATE UNIQUE INDEX sync_queue_pkey ON public.sync_queue USING btree (id);

alter table "public"."sync_logs" add constraint "sync_logs_pkey" PRIMARY KEY using index "sync_logs_pkey";

alter table "public"."sync_queue" add constraint "sync_queue_pkey" PRIMARY KEY using index "sync_queue_pkey";

alter table "public"."artists" add constraint "artists_spotify_id_key" UNIQUE using index "artists_spotify_id_key";

alter table "public"."setlists" add constraint "setlists_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id) not valid;

alter table "public"."setlists" validate constraint "setlists_venue_id_fkey";

alter table "public"."sync_logs" add constraint "sync_logs_entity_check" CHECK ((entity_type = ANY (ARRAY['artist'::text, 'show'::text, 'setlist'::text, 'venue'::text, 'song'::text]))) not valid;

alter table "public"."sync_logs" validate constraint "sync_logs_entity_check";

alter table "public"."votes" add constraint "votes_setlist_song_id_fkey" FOREIGN KEY (setlist_song_id) REFERENCES setlist_songs(id) not valid;

alter table "public"."votes" validate constraint "votes_setlist_song_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM api_cache WHERE expires_at < now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_sync(entity_type text, service_name text, service_id text, reference_data jsonb DEFAULT NULL::jsonb, priority integer DEFAULT 5, max_attempts integer DEFAULT 3)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.process_sync_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_sync_tables()
 RETURNS void
 LANGUAGE plpgsql
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
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_sync(entity_type text, external_id text, reference_data jsonb DEFAULT NULL::jsonb, priority integer DEFAULT 5, max_attempts integer DEFAULT 3)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Call the new function with a default service name
  RETURN public.enqueue_sync(entity_type, 'ticketmaster', external_id, reference_data, priority, max_attempts);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_sync_system(target_id text, entity_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
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
          'service_name', service_name,
          'service_id', service_id
        ) FROM sync_states WHERE entity_id = target_id AND entity_type = $2)
    ) INTO result;
  
  RETURN result;
END;
$function$
;

grant delete on table "public"."admins" to "service_role";

grant insert on table "public"."admins" to "service_role";

grant references on table "public"."admins" to "service_role";

grant select on table "public"."admins" to "service_role";

grant trigger on table "public"."admins" to "service_role";

grant truncate on table "public"."admins" to "service_role";

grant update on table "public"."admins" to "service_role";

grant delete on table "public"."api_cache" to "service_role";

grant insert on table "public"."api_cache" to "service_role";

grant references on table "public"."api_cache" to "service_role";

grant select on table "public"."api_cache" to "service_role";

grant trigger on table "public"."api_cache" to "service_role";

grant truncate on table "public"."api_cache" to "service_role";

grant update on table "public"."api_cache" to "service_role";

grant delete on table "public"."error_logs" to "service_role";

grant insert on table "public"."error_logs" to "service_role";

grant references on table "public"."error_logs" to "service_role";

grant select on table "public"."error_logs" to "service_role";

grant trigger on table "public"."error_logs" to "service_role";

grant truncate on table "public"."error_logs" to "service_role";

grant update on table "public"."error_logs" to "service_role";

grant delete on table "public"."migrations" to "service_role";

grant insert on table "public"."migrations" to "service_role";

grant references on table "public"."migrations" to "service_role";

grant select on table "public"."migrations" to "service_role";

grant trigger on table "public"."migrations" to "service_role";

grant truncate on table "public"."migrations" to "service_role";

grant update on table "public"."migrations" to "service_role";

grant delete on table "public"."sync_logs" to "anon";

grant insert on table "public"."sync_logs" to "anon";

grant references on table "public"."sync_logs" to "anon";

grant select on table "public"."sync_logs" to "anon";

grant trigger on table "public"."sync_logs" to "anon";

grant truncate on table "public"."sync_logs" to "anon";

grant update on table "public"."sync_logs" to "anon";

grant delete on table "public"."sync_logs" to "authenticated";

grant insert on table "public"."sync_logs" to "authenticated";

grant references on table "public"."sync_logs" to "authenticated";

grant select on table "public"."sync_logs" to "authenticated";

grant trigger on table "public"."sync_logs" to "authenticated";

grant truncate on table "public"."sync_logs" to "authenticated";

grant update on table "public"."sync_logs" to "authenticated";

grant delete on table "public"."sync_logs" to "service_role";

grant insert on table "public"."sync_logs" to "service_role";

grant references on table "public"."sync_logs" to "service_role";

grant select on table "public"."sync_logs" to "service_role";

grant trigger on table "public"."sync_logs" to "service_role";

grant truncate on table "public"."sync_logs" to "service_role";

grant update on table "public"."sync_logs" to "service_role";

grant delete on table "public"."sync_queue" to "anon";

grant insert on table "public"."sync_queue" to "anon";

grant references on table "public"."sync_queue" to "anon";

grant select on table "public"."sync_queue" to "anon";

grant trigger on table "public"."sync_queue" to "anon";

grant truncate on table "public"."sync_queue" to "anon";

grant update on table "public"."sync_queue" to "anon";

grant delete on table "public"."sync_queue" to "authenticated";

grant insert on table "public"."sync_queue" to "authenticated";

grant references on table "public"."sync_queue" to "authenticated";

grant select on table "public"."sync_queue" to "authenticated";

grant trigger on table "public"."sync_queue" to "authenticated";

grant truncate on table "public"."sync_queue" to "authenticated";

grant update on table "public"."sync_queue" to "authenticated";

grant delete on table "public"."sync_queue" to "service_role";

grant insert on table "public"."sync_queue" to "service_role";

grant references on table "public"."sync_queue" to "service_role";

grant select on table "public"."sync_queue" to "service_role";

grant trigger on table "public"."sync_queue" to "service_role";

grant truncate on table "public"."sync_queue" to "service_role";

grant update on table "public"."sync_queue" to "service_role";

grant delete on table "public"."sync_states" to "anon";

grant insert on table "public"."sync_states" to "anon";

grant references on table "public"."sync_states" to "anon";

grant select on table "public"."sync_states" to "anon";

grant trigger on table "public"."sync_states" to "anon";

grant truncate on table "public"."sync_states" to "anon";

grant update on table "public"."sync_states" to "anon";

grant delete on table "public"."sync_states" to "authenticated";

grant insert on table "public"."sync_states" to "authenticated";

grant references on table "public"."sync_states" to "authenticated";

grant select on table "public"."sync_states" to "authenticated";

grant trigger on table "public"."sync_states" to "authenticated";

grant truncate on table "public"."sync_states" to "authenticated";

grant update on table "public"."sync_states" to "authenticated";

grant delete on table "public"."sync_states" to "service_role";

grant insert on table "public"."sync_states" to "service_role";

grant references on table "public"."sync_states" to "service_role";

grant select on table "public"."sync_states" to "service_role";

grant trigger on table "public"."sync_states" to "service_role";

grant truncate on table "public"."sync_states" to "service_role";

grant update on table "public"."sync_states" to "service_role";

grant delete on table "public"."trending_shows_cache" to "service_role";

grant insert on table "public"."trending_shows_cache" to "service_role";

grant references on table "public"."trending_shows_cache" to "service_role";

grant select on table "public"."trending_shows_cache" to "service_role";

grant trigger on table "public"."trending_shows_cache" to "service_role";

grant truncate on table "public"."trending_shows_cache" to "service_role";

grant update on table "public"."trending_shows_cache" to "service_role";

create policy "service_role_access"
on "public"."sync_queue"
as permissive
for all
to service_role
using (true)
with check (true);



