create extension if not exists "pg_net" with schema "public" version '0.14.0';

alter table "public"."shows" add column "last_sync" timestamp with time zone;

alter table "public"."shows" add column "last_sync_error" text;

alter table "public"."shows" add column "setlist_suggestions" jsonb;

alter table "public"."shows" add column "sync_status" text;


