ALTER TABLE artists
ADD CONSTRAINT fk_artist_metadata
FOREIGN KEY (spotify_id, setlistfm_id)
REFERENCES artist_metadata(spotify_id, setlistfm_id);