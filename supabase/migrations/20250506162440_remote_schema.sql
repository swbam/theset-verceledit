create extension if not exists "pg_net" with schema "public" version '0.14.0';

CREATE UNIQUE INDEX songs_spotify_id_artist_id_key ON public.songs USING btree (spotify_id, artist_id);

alter table "public"."songs" add constraint "songs_spotify_id_artist_id_key" UNIQUE using index "songs_spotify_id_artist_id_key";


