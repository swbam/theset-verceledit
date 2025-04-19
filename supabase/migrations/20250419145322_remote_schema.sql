create extension if not exists "pg_net" with schema "public" version '0.14.0';

drop policy "service_role_access" on "public"."sync_queue";

revoke delete on table "public"."sync_queue" from "anon";

revoke insert on table "public"."sync_queue" from "anon";

revoke references on table "public"."sync_queue" from "anon";

revoke select on table "public"."sync_queue" from "anon";

revoke trigger on table "public"."sync_queue" from "anon";

revoke truncate on table "public"."sync_queue" from "anon";

revoke update on table "public"."sync_queue" from "anon";

revoke delete on table "public"."sync_queue" from "authenticated";

revoke insert on table "public"."sync_queue" from "authenticated";

revoke references on table "public"."sync_queue" from "authenticated";

revoke select on table "public"."sync_queue" from "authenticated";

revoke trigger on table "public"."sync_queue" from "authenticated";

revoke truncate on table "public"."sync_queue" from "authenticated";

revoke update on table "public"."sync_queue" from "authenticated";

revoke delete on table "public"."sync_queue" from "service_role";

revoke insert on table "public"."sync_queue" from "service_role";

revoke references on table "public"."sync_queue" from "service_role";

revoke select on table "public"."sync_queue" from "service_role";

revoke trigger on table "public"."sync_queue" from "service_role";

revoke truncate on table "public"."sync_queue" from "service_role";

revoke update on table "public"."sync_queue" from "service_role";

alter table "public"."sync_queue" drop constraint "sync_queue_pkey";

drop index if exists "public"."sync_queue_pkey";

drop table "public"."sync_queue";

create table "public"."played_setlist_songs" (
    "id" uuid not null default uuid_generate_v4(),
    "setlist_id" uuid,
    "song_id" uuid,
    "position" integer,
    "is_encore" boolean default false,
    "info" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."played_setlist_songs" enable row level security;

create table "public"."setlist_raw_data" (
    "id" uuid not null default uuid_generate_v4(),
    "artist_id" uuid,
    "show_id" uuid,
    "setlist_id" uuid,
    "raw_data" jsonb,
    "created_at" timestamp with time zone default now()
);


create table "public"."top_tracks" (
    "id" uuid not null default uuid_generate_v4(),
    "artist_id" uuid not null,
    "name" text not null,
    "album" text,
    "album_id" text,
    "spotify_id" text,
    "duration_ms" integer,
    "popularity" integer default 0,
    "preview_url" text,
    "spotify_url" text,
    "album_image_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."tracks" (
    "id" uuid not null default uuid_generate_v4(),
    "artist_id" uuid,
    "name" text not null,
    "spotify_id" text,
    "spotify_url" text,
    "duration_ms" integer,
    "popularity" integer,
    "preview_url" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."artists" add column "external_id" text;

alter table "public"."artists" add column "setlist_fm_mbid" text;

alter table "public"."artists" add column "spotify_url" text;

alter table "public"."artists" add column "tm_id" text;

alter table "public"."setlist_songs" add column "artist_id" uuid;

alter table "public"."setlist_songs" add column "last_updated" timestamp with time zone default now();

alter table "public"."setlist_songs" add column "name" text;

alter table "public"."setlist_songs" add column "track_id" uuid;

alter table "public"."setlist_songs" add column "vote_count" integer default 0;

alter table "public"."setlists" add column "setlist_id" text;

alter table "public"."shows" add column "external_id" text;

alter table "public"."venues" add column "external_id" text;

drop sequence if exists "public"."sync_queue_id_seq";

CREATE UNIQUE INDEX artists_external_id_key ON public.artists USING btree (external_id);

CREATE INDEX idx_artists_external_id ON public.artists USING btree (external_id);

CREATE INDEX idx_played_setlist_songs_setlist_id ON public.played_setlist_songs USING btree (setlist_id);

CREATE INDEX idx_played_setlist_songs_song_id ON public.played_setlist_songs USING btree (song_id);

CREATE INDEX idx_setlist_songs_artist_id ON public.setlist_songs USING btree (artist_id);

CREATE INDEX idx_setlist_songs_vote_count ON public.setlist_songs USING btree (vote_count DESC);

CREATE INDEX idx_shows_external_id ON public.shows USING btree (external_id);

CREATE INDEX idx_sync_states_entity ON public.sync_states USING btree (entity_id, entity_type);

CREATE INDEX idx_sync_tasks_created_at ON public.sync_tasks USING btree (created_at DESC);

CREATE INDEX idx_sync_tasks_entity_id ON public.sync_tasks USING btree (entity_id);

CREATE INDEX idx_sync_tasks_entity_type ON public.sync_tasks USING btree (entity_type);

CREATE INDEX idx_sync_tasks_priority ON public.sync_tasks USING btree (priority DESC);

CREATE INDEX idx_sync_tasks_status ON public.sync_tasks USING btree (status);

CREATE INDEX idx_top_tracks_artist_id ON public.top_tracks USING btree (artist_id);

CREATE INDEX idx_top_tracks_popularity ON public.top_tracks USING btree (popularity DESC);

CREATE INDEX idx_top_tracks_spotify_id ON public.top_tracks USING btree (spotify_id);

CREATE INDEX idx_venues_external_id ON public.venues USING btree (external_id);

CREATE UNIQUE INDEX played_setlist_songs_pkey ON public.played_setlist_songs USING btree (id);

CREATE UNIQUE INDEX played_setlist_songs_setlist_id_position_key ON public.played_setlist_songs USING btree (setlist_id, "position");

CREATE UNIQUE INDEX setlist_raw_data_pkey ON public.setlist_raw_data USING btree (id);

CREATE UNIQUE INDEX setlist_raw_data_show_id_key ON public.setlist_raw_data USING btree (show_id);

CREATE UNIQUE INDEX setlists_setlist_id_key ON public.setlists USING btree (setlist_id);

CREATE UNIQUE INDEX shows_external_id_key ON public.shows USING btree (external_id);

CREATE UNIQUE INDEX top_tracks_pkey ON public.top_tracks USING btree (id);

CREATE UNIQUE INDEX top_tracks_spotify_id_key ON public.top_tracks USING btree (spotify_id);

CREATE UNIQUE INDEX tracks_pkey ON public.tracks USING btree (id);

CREATE UNIQUE INDEX tracks_spotify_id_key ON public.tracks USING btree (spotify_id);

CREATE UNIQUE INDEX venues_external_id_unique ON public.venues USING btree (external_id);

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_pkey" PRIMARY KEY using index "played_setlist_songs_pkey";

alter table "public"."setlist_raw_data" add constraint "setlist_raw_data_pkey" PRIMARY KEY using index "setlist_raw_data_pkey";

alter table "public"."top_tracks" add constraint "top_tracks_pkey" PRIMARY KEY using index "top_tracks_pkey";

alter table "public"."tracks" add constraint "tracks_pkey" PRIMARY KEY using index "tracks_pkey";

alter table "public"."artists" add constraint "artists_external_id_key" UNIQUE using index "artists_external_id_key";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_setlist_id_fkey" FOREIGN KEY (setlist_id) REFERENCES setlists(id) not valid;

alter table "public"."played_setlist_songs" validate constraint "played_setlist_songs_setlist_id_fkey";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_setlist_id_position_key" UNIQUE using index "played_setlist_songs_setlist_id_position_key";

alter table "public"."played_setlist_songs" add constraint "played_setlist_songs_song_id_fkey" FOREIGN KEY (song_id) REFERENCES tracks(id) not valid;

alter table "public"."played_setlist_songs" validate constraint "played_setlist_songs_song_id_fkey";

alter table "public"."setlist_raw_data" add constraint "setlist_raw_data_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) not valid;

alter table "public"."setlist_raw_data" validate constraint "setlist_raw_data_artist_id_fkey";

alter table "public"."setlist_raw_data" add constraint "setlist_raw_data_setlist_id_fkey" FOREIGN KEY (setlist_id) REFERENCES setlists(id) not valid;

alter table "public"."setlist_raw_data" validate constraint "setlist_raw_data_setlist_id_fkey";

alter table "public"."setlist_raw_data" add constraint "setlist_raw_data_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) not valid;

alter table "public"."setlist_raw_data" validate constraint "setlist_raw_data_show_id_fkey";

alter table "public"."setlist_raw_data" add constraint "setlist_raw_data_show_id_key" UNIQUE using index "setlist_raw_data_show_id_key";

alter table "public"."setlist_songs" add constraint "setlist_songs_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) not valid;

alter table "public"."setlist_songs" validate constraint "setlist_songs_artist_id_fkey";

alter table "public"."setlists" add constraint "setlists_setlist_id_key" UNIQUE using index "setlists_setlist_id_key";

alter table "public"."shows" add constraint "shows_external_id_key" UNIQUE using index "shows_external_id_key";

alter table "public"."top_tracks" add constraint "top_tracks_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) not valid;

alter table "public"."top_tracks" validate constraint "top_tracks_artist_id_fkey";

alter table "public"."top_tracks" add constraint "top_tracks_spotify_id_key" UNIQUE using index "top_tracks_spotify_id_key";

alter table "public"."tracks" add constraint "tracks_artist_id_fkey" FOREIGN KEY (artist_id) REFERENCES artists(id) not valid;

alter table "public"."tracks" validate constraint "tracks_artist_id_fkey";

alter table "public"."tracks" add constraint "tracks_spotify_id_key" UNIQUE using index "tracks_spotify_id_key";

alter table "public"."venues" add constraint "venues_external_id_unique" UNIQUE using index "venues_external_id_unique";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_sync_tasks(p_status text DEFAULT NULL::text, p_entity_type text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS SETOF sync_tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_vote(p_song_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.increment_vote(p_song_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

grant delete on table "public"."played_setlist_songs" to "anon";

grant insert on table "public"."played_setlist_songs" to "anon";

grant references on table "public"."played_setlist_songs" to "anon";

grant select on table "public"."played_setlist_songs" to "anon";

grant trigger on table "public"."played_setlist_songs" to "anon";

grant truncate on table "public"."played_setlist_songs" to "anon";

grant update on table "public"."played_setlist_songs" to "anon";

grant delete on table "public"."played_setlist_songs" to "authenticated";

grant insert on table "public"."played_setlist_songs" to "authenticated";

grant references on table "public"."played_setlist_songs" to "authenticated";

grant select on table "public"."played_setlist_songs" to "authenticated";

grant trigger on table "public"."played_setlist_songs" to "authenticated";

grant truncate on table "public"."played_setlist_songs" to "authenticated";

grant update on table "public"."played_setlist_songs" to "authenticated";

grant delete on table "public"."played_setlist_songs" to "service_role";

grant insert on table "public"."played_setlist_songs" to "service_role";

grant references on table "public"."played_setlist_songs" to "service_role";

grant select on table "public"."played_setlist_songs" to "service_role";

grant trigger on table "public"."played_setlist_songs" to "service_role";

grant truncate on table "public"."played_setlist_songs" to "service_role";

grant update on table "public"."played_setlist_songs" to "service_role";

grant delete on table "public"."setlist_raw_data" to "anon";

grant insert on table "public"."setlist_raw_data" to "anon";

grant references on table "public"."setlist_raw_data" to "anon";

grant select on table "public"."setlist_raw_data" to "anon";

grant trigger on table "public"."setlist_raw_data" to "anon";

grant truncate on table "public"."setlist_raw_data" to "anon";

grant update on table "public"."setlist_raw_data" to "anon";

grant delete on table "public"."setlist_raw_data" to "authenticated";

grant insert on table "public"."setlist_raw_data" to "authenticated";

grant references on table "public"."setlist_raw_data" to "authenticated";

grant select on table "public"."setlist_raw_data" to "authenticated";

grant trigger on table "public"."setlist_raw_data" to "authenticated";

grant truncate on table "public"."setlist_raw_data" to "authenticated";

grant update on table "public"."setlist_raw_data" to "authenticated";

grant delete on table "public"."setlist_raw_data" to "service_role";

grant insert on table "public"."setlist_raw_data" to "service_role";

grant references on table "public"."setlist_raw_data" to "service_role";

grant select on table "public"."setlist_raw_data" to "service_role";

grant trigger on table "public"."setlist_raw_data" to "service_role";

grant truncate on table "public"."setlist_raw_data" to "service_role";

grant update on table "public"."setlist_raw_data" to "service_role";

grant delete on table "public"."top_tracks" to "anon";

grant insert on table "public"."top_tracks" to "anon";

grant references on table "public"."top_tracks" to "anon";

grant select on table "public"."top_tracks" to "anon";

grant trigger on table "public"."top_tracks" to "anon";

grant truncate on table "public"."top_tracks" to "anon";

grant update on table "public"."top_tracks" to "anon";

grant delete on table "public"."top_tracks" to "authenticated";

grant insert on table "public"."top_tracks" to "authenticated";

grant references on table "public"."top_tracks" to "authenticated";

grant select on table "public"."top_tracks" to "authenticated";

grant trigger on table "public"."top_tracks" to "authenticated";

grant truncate on table "public"."top_tracks" to "authenticated";

grant update on table "public"."top_tracks" to "authenticated";

grant delete on table "public"."top_tracks" to "service_role";

grant insert on table "public"."top_tracks" to "service_role";

grant references on table "public"."top_tracks" to "service_role";

grant select on table "public"."top_tracks" to "service_role";

grant trigger on table "public"."top_tracks" to "service_role";

grant truncate on table "public"."top_tracks" to "service_role";

grant update on table "public"."top_tracks" to "service_role";

grant delete on table "public"."tracks" to "anon";

grant insert on table "public"."tracks" to "anon";

grant references on table "public"."tracks" to "anon";

grant select on table "public"."tracks" to "anon";

grant trigger on table "public"."tracks" to "anon";

grant truncate on table "public"."tracks" to "anon";

grant update on table "public"."tracks" to "anon";

grant delete on table "public"."tracks" to "authenticated";

grant insert on table "public"."tracks" to "authenticated";

grant references on table "public"."tracks" to "authenticated";

grant select on table "public"."tracks" to "authenticated";

grant trigger on table "public"."tracks" to "authenticated";

grant truncate on table "public"."tracks" to "authenticated";

grant update on table "public"."tracks" to "authenticated";

grant delete on table "public"."tracks" to "service_role";

grant insert on table "public"."tracks" to "service_role";

grant references on table "public"."tracks" to "service_role";

grant select on table "public"."tracks" to "service_role";

grant trigger on table "public"."tracks" to "service_role";

grant truncate on table "public"."tracks" to "service_role";

grant update on table "public"."tracks" to "service_role";

create policy "Enable insert for authenticated users only"
on "public"."played_setlist_songs"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."played_setlist_songs"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users only"
on "public"."played_setlist_songs"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Admins can create sync tasks"
on "public"."sync_tasks"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));


create policy "Admins can update sync tasks"
on "public"."sync_tasks"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));


create policy "Admins can view all sync tasks"
on "public"."sync_tasks"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));


CREATE TRIGGER update_top_tracks_updated_at BEFORE UPDATE ON public.top_tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();


