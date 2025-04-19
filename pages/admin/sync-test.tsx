import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Container, Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Paper, Grid, Alert, CircularProgress } from '@mui/material';

export default function SyncTestPage() {
  const supabase = useSupabaseClient();
  const [entityType, setEntityType] = useState<'artist' | 'venue' | 'show' | 'song'>('artist');
  const [entityId, setEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [ticketmasterId, setTicketmasterId] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [options, setOptions] = useState({
    forceRefresh: false,
    skipDependencies: false
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSyncClick = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create the payload based on the form inputs
      const payload = {
        entityType,
        entityId: entityId || undefined,
        entityName: entityName || undefined,
        ticketmasterId: ticketmasterId || undefined,
        spotifyId: spotifyId || undefined,
        options
      };

      // Call the unified-sync function
      const { data, error } = await supabase.functions.invoke('unified-sync', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Unknown error occurred');
      }

      setResult(data);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (option: keyof typeof options) => {
    setOptions({
      ...options,
      [option]: !options[option]
    });
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sync Test Interface
        </Typography>

        <Paper elevation={3}>
          <Box p={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="entity-type-label">Entity Type</InputLabel>
                  <Select
                    labelId="entity-type-label"
                    value={entityType}
                    label="Entity Type"
                    onChange={(e) => setEntityType(e.target.value as any)}
                  >
                    <MenuItem value="artist">Artist</MenuItem>
                    <MenuItem value="venue">Venue</MenuItem>
                    <MenuItem value="show">Show</MenuItem>
                    <MenuItem value="song">Song</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Entity ID (UUID)"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  helperText="Leave blank to create new"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  helperText="Required for new entities"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ticketmaster ID"
                  value={ticketmasterId}
                  onChange={(e) => setTicketmasterId(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Spotify ID"
                  value={spotifyId}
                  onChange={(e) => setSpotifyId(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    color={options.forceRefresh ? "primary" : "inherit"}
                    onClick={() => handleCheckboxChange('forceRefresh')}
                  >
                    Force Refresh: {options.forceRefresh ? "ON" : "OFF"}
                  </Button>
                  <Button
                    variant="outlined"
                    color={options.skipDependencies ? "primary" : "inherit"}
                    onClick={() => handleCheckboxChange('skipDependencies')}
                  >
                    Skip Dependencies: {options.skipDependencies ? "ON" : "OFF"}
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSyncClick}
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={24} color="inherit" />}
                >
                  {loading ? 'Syncing...' : 'Start Sync'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {error && (
          <Box mt={3}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {result && (
          <Box mt={3}>
            <Paper elevation={3}>
              <Box p={3}>
                <Typography variant="h6" gutterBottom>
                  Sync Result
                </Typography>
                <pre style={{ overflow: 'auto', maxHeight: '500px' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Container>
  );
} 