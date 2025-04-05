export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for now, restrict in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS
};