create or replace function increment_vote(song_id uuid, user_id uuid)
returns void as $$
begin
  insert into votes (song_id, user_id, count)
  values (song_id, user_id, 1)
  on conflict (song_id, user_id)
  do update set count = votes.count + 1;

  update songs
  set vote_count = vote_count + 1
  where id = song_id;
end;
$$ language plpgsql;

create or replace function decrement_vote(song_id uuid, user_id uuid)
returns void as $$
begin
  update votes
  set count = greatest(count - 1, 0)
  where song_id = song_id and user_id = user_id;

  update songs
  set vote_count = greatest(vote_count - 1, 0)
  where id = song_id;
end;
$$ language plpgsql;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_song ON votes(user_id, song_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_artist ON songs(artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_concerts_artist_date ON concerts(artist_id, date DESC);
CREATE INDEX CONCURRENTLY artists_last_updated_idx ON public.artists USING BRIN (last_updated);
CREATE INDEX CONCURRENTLY shows_venue_idx ON public.shows USING GIN (venue);
CREATE INDEX CONCURRENTLY setlists_artist_id_idx ON public.setlists (artist_id); 