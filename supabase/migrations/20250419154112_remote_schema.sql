create extension if not exists "pg_net" with schema "public" version '0.14.0';

alter table "public"."sync_states" add column "created_at" timestamp with time zone default now();

alter table "public"."sync_states" add column "updated_at" timestamp with time zone default now();

alter table "public"."sync_states" add constraint "sync_states_entity_type_check" CHECK ((entity_type = ANY (ARRAY['artist'::text, 'venue'::text, 'show'::text, 'song'::text, 'setlist'::text]))) not valid;

alter table "public"."sync_states" validate constraint "sync_states_entity_type_check";


