-- Update setlist_songs table to align with our schema
-- First, check if the column exists before trying to add it
DO $$
BEGIN
    -- Add song_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'song_id'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN song_id UUID REFERENCES public.songs(id);
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN name TEXT;
    END IF;

    -- Add track_id column if it doesn't exist (for compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'track_id'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN track_id UUID;
    END IF;

    -- Add vote_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'vote_count'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN vote_count INTEGER DEFAULT 0;
    END IF;

    -- Add position column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'position'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN position INTEGER;
    END IF;

    -- Add artist_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'artist_id'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN artist_id UUID REFERENCES public.artists(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_artist_id ON setlist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_vote_count ON setlist_songs(vote_count DESC);