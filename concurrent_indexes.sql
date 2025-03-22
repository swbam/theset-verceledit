-- IMPORTANT: Run each CREATE INDEX statement separately
-- These cannot be run in a transaction block

-- Run this first to enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Votes indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_song ON votes(user_id, song_id);

-- Songs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_artist ON songs(artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS songs_setlist_idx ON songs(setlist_id);

-- Shows/Concerts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concerts_artist_date ON concerts(artist_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS shows_artist_date_idx ON shows(artist_id, date DESC);

-- Artists indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS artists_last_updated_idx ON artists USING BRIN (last_updated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS artists_setlist_fm_mbid_idx ON artists(setlist_fm_mbid);

-- Setlists indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS setlists_artist_id_idx ON setlists(artist_id);

-- Venue fulltext search (optional - remove if GIN not supported in your plan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS shows_venue_idx ON shows USING GIN (venue gin_trgm_ops); 