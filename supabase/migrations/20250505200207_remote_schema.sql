create extension if not exists "pg_net" with schema "public" version '0.14.0';

drop trigger if exists "update_top_tracks_updated_at" on "public"."top_tracks";

revoke delete on table "public"."setlist_raw_data" from "anon";

revoke insert on table "public"."setlist_raw_data" from "anon";

revoke references on table "public"."setlist_raw_data" from "anon";

revoke select on table "public"."setlist_raw_data" from "anon";

revoke trigger on table "public"."setlist_raw_data" from "anon";

revoke truncate on table "public"."setlist_raw_data" from "anon";

revoke update on table "public"."setlist_raw_data" from "anon";

revoke delete on table "public"."setlist_raw_data" from "authenticated";

revoke insert on table "public"."setlist_raw_data" from "authenticated";

revoke references on table "public"."setlist_raw_data" from "authenticated";

revoke select on table "public"."setlist_raw_data" from "authenticated";

revoke trigger on table "public"."setlist_raw_data" from "authenticated";

revoke truncate on table "public"."setlist_raw_data" from "authenticated";

revoke update on table "public"."setlist_raw_data" from "authenticated";

revoke delete on table "public"."setlist_raw_data" from "service_role";

revoke insert on table "public"."setlist_raw_data" from "service_role";

revoke references on table "public"."setlist_raw_data" from "service_role";

revoke select on table "public"."setlist_raw_data" from "service_role";

revoke trigger on table "public"."setlist_raw_data" from "service_role";

revoke truncate on table "public"."setlist_raw_data" from "service_role";

revoke update on table "public"."setlist_raw_data" from "service_role";

revoke delete on table "public"."top_tracks" from "anon";

revoke insert on table "public"."top_tracks" from "anon";

revoke references on table "public"."top_tracks" from "anon";

revoke select on table "public"."top_tracks" from "anon";

revoke trigger on table "public"."top_tracks" from "anon";

revoke truncate on table "public"."top_tracks" from "anon";

revoke update on table "public"."top_tracks" from "anon";

revoke delete on table "public"."top_tracks" from "authenticated";

revoke insert on table "public"."top_tracks" from "authenticated";

revoke references on table "public"."top_tracks" from "authenticated";

revoke select on table "public"."top_tracks" from "authenticated";

revoke trigger on table "public"."top_tracks" from "authenticated";

revoke truncate on table "public"."top_tracks" from "authenticated";

revoke update on table "public"."top_tracks" from "authenticated";

revoke delete on table "public"."top_tracks" from "service_role";

revoke insert on table "public"."top_tracks" from "service_role";

revoke references on table "public"."top_tracks" from "service_role";

revoke select on table "public"."top_tracks" from "service_role";

revoke trigger on table "public"."top_tracks" from "service_role";

revoke truncate on table "public"."top_tracks" from "service_role";

revoke update on table "public"."top_tracks" from "service_role";

revoke delete on table "public"."tracks" from "anon";

revoke insert on table "public"."tracks" from "anon";

revoke references on table "public"."tracks" from "anon";

revoke select on table "public"."tracks" from "anon";

revoke trigger on table "public"."tracks" from "anon";

revoke truncate on table "public"."tracks" from "anon";

revoke update on table "public"."tracks" from "anon";

revoke delete on table "public"."tracks" from "authenticated";

revoke insert on table "public"."tracks" from "authenticated";

revoke references on table "public"."tracks" from "authenticated";

revoke select on table "public"."tracks" from "authenticated";

revoke trigger on table "public"."tracks" from "authenticated";

revoke truncate on table "public"."tracks" from "authenticated";

revoke update on table "public"."tracks" from "authenticated";

revoke delete on table "public"."tracks" from "service_role";

revoke insert on table "public"."tracks" from "service_role";

revoke references on table "public"."tracks" from "service_role";

revoke select on table "public"."tracks" from "service_role";

revoke trigger on table "public"."tracks" from "service_role";

revoke truncate on table "public"."tracks" from "service_role";

revoke update on table "public"."tracks" from "service_role";

alter table "public"."played_setlist_songs" drop constraint "played_setlist_songs_song_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_artist_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_setlist_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_show_id_fkey";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_show_id_key";

alter table "public"."top_tracks" drop constraint "top_tracks_artist_id_fkey";

alter table "public"."top_tracks" drop constraint "top_tracks_spotify_id_key";

alter table "public"."tracks" drop constraint "tracks_artist_id_fkey";

alter table "public"."tracks" drop constraint "tracks_spotify_id_key";

alter table "public"."setlist_raw_data" drop constraint "setlist_raw_data_pkey";

alter table "public"."top_tracks" drop constraint "top_tracks_pkey";

alter table "public"."tracks" drop constraint "tracks_pkey";

drop index if exists "public"."idx_top_tracks_artist_id";

drop index if exists "public"."idx_top_tracks_popularity";

drop index if exists "public"."idx_top_tracks_spotify_id";

drop index if exists "public"."setlist_raw_data_pkey";

drop index if exists "public"."setlist_raw_data_show_id_key";

drop index if exists "public"."top_tracks_pkey";

drop index if exists "public"."top_tracks_spotify_id_key";

drop index if exists "public"."tracks_pkey";

drop index if exists "public"."tracks_spotify_id_key";

drop table "public"."setlist_raw_data";

drop table "public"."top_tracks";

drop table "public"."tracks";


