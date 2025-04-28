create extension if not exists "pg_net" with schema "public" version '0.14.0';

drop policy "Service role and anon can do all on artists" on "public"."artists";

drop policy "Service role and anon can do all on setlists" on "public"."setlists";

drop policy "Service role and anon can do all on shows" on "public"."shows";

drop policy "Service role and anon can do all on songs" on "public"."songs";

drop policy "Service role and anon can do all on venues" on "public"."venues";

drop policy "Service role and anon can do all on votes" on "public"."votes";

revoke delete on table "public"."admins" from "anon";

revoke insert on table "public"."admins" from "anon";

revoke references on table "public"."admins" from "anon";

revoke select on table "public"."admins" from "anon";

revoke trigger on table "public"."admins" from "anon";

revoke truncate on table "public"."admins" from "anon";

revoke update on table "public"."admins" from "anon";

revoke delete on table "public"."admins" from "authenticated";

revoke insert on table "public"."admins" from "authenticated";

revoke references on table "public"."admins" from "authenticated";

revoke select on table "public"."admins" from "authenticated";

revoke trigger on table "public"."admins" from "authenticated";

revoke truncate on table "public"."admins" from "authenticated";

revoke update on table "public"."admins" from "authenticated";

revoke delete on table "public"."api_cache" from "anon";

revoke insert on table "public"."api_cache" from "anon";

revoke references on table "public"."api_cache" from "anon";

revoke select on table "public"."api_cache" from "anon";

revoke trigger on table "public"."api_cache" from "anon";

revoke truncate on table "public"."api_cache" from "anon";

revoke update on table "public"."api_cache" from "anon";

revoke delete on table "public"."api_cache" from "authenticated";

revoke insert on table "public"."api_cache" from "authenticated";

revoke references on table "public"."api_cache" from "authenticated";

revoke select on table "public"."api_cache" from "authenticated";

revoke trigger on table "public"."api_cache" from "authenticated";

revoke truncate on table "public"."api_cache" from "authenticated";

revoke update on table "public"."api_cache" from "authenticated";

revoke delete on table "public"."error_logs" from "anon";

revoke insert on table "public"."error_logs" from "anon";

revoke references on table "public"."error_logs" from "anon";

revoke select on table "public"."error_logs" from "anon";

revoke trigger on table "public"."error_logs" from "anon";

revoke truncate on table "public"."error_logs" from "anon";

revoke update on table "public"."error_logs" from "anon";

revoke delete on table "public"."migrations" from "anon";

revoke insert on table "public"."migrations" from "anon";

revoke references on table "public"."migrations" from "anon";

revoke select on table "public"."migrations" from "anon";

revoke trigger on table "public"."migrations" from "anon";

revoke truncate on table "public"."migrations" from "anon";

revoke update on table "public"."migrations" from "anon";

revoke delete on table "public"."migrations" from "authenticated";

revoke insert on table "public"."migrations" from "authenticated";

revoke references on table "public"."migrations" from "authenticated";

revoke select on table "public"."migrations" from "authenticated";

revoke trigger on table "public"."migrations" from "authenticated";

revoke truncate on table "public"."migrations" from "authenticated";

revoke update on table "public"."migrations" from "authenticated";

revoke delete on table "public"."trending_shows_cache" from "anon";

revoke insert on table "public"."trending_shows_cache" from "anon";

revoke references on table "public"."trending_shows_cache" from "anon";

revoke select on table "public"."trending_shows_cache" from "anon";

revoke trigger on table "public"."trending_shows_cache" from "anon";

revoke truncate on table "public"."trending_shows_cache" from "anon";

revoke update on table "public"."trending_shows_cache" from "anon";

revoke delete on table "public"."trending_shows_cache" from "authenticated";

revoke insert on table "public"."trending_shows_cache" from "authenticated";

revoke references on table "public"."trending_shows_cache" from "authenticated";

revoke select on table "public"."trending_shows_cache" from "authenticated";

revoke trigger on table "public"."trending_shows_cache" from "authenticated";

revoke truncate on table "public"."trending_shows_cache" from "authenticated";

revoke update on table "public"."trending_shows_cache" from "authenticated";

create policy "Service role and anon can do all on artists"
on "public"."artists"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "Service role and anon can do all on setlists"
on "public"."setlists"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "Service role and anon can do all on shows"
on "public"."shows"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "Service role and anon can do all on songs"
on "public"."songs"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "Service role and anon can do all on venues"
on "public"."venues"
as permissive
for all
to service_role, anon
using (true)
with check (true);


create policy "Service role and anon can do all on votes"
on "public"."votes"
as permissive
for all
to service_role, anon
using (true)
with check (true);



