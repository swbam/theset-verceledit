create extension if not exists "pg_net" with schema "public" version '0.14.0';

CREATE INDEX idx_shows_setlist_suggestions ON public.shows USING gin (setlist_suggestions);


