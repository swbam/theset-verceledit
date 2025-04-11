CREATE OR REPLACE FUNCTION increment_vote(p_song_id uuid, p_user_id uuid) RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_vote(p_song_id uuid, p_user_id uuid) RETURNS void AS $$
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
$$ LANGUAGE plpgsql;
