#!/bin/bash

# Delete old sync functions from Supabase
echo "Deleting old sync functions..."

# List of old functions to delete
OLD_FUNCTIONS=(
  "sync-artist"
  "fetch-past-setlists"
  "import-artist"
  "sync-setlist"
  "sync-show"
  "sync-song"
  "sync-venue"
  "update-trending-shows"
  "orchestrate-sync"
  "search-shows"
  "search-artists"
  "vote-song"
  "search-attractions"
  "spotify-sync"
)

# Delete each function
for func in "${OLD_FUNCTIONS[@]}"; do
  echo "Deleting function: $func"
  supabase functions delete $func
done

echo "Old functions deleted. Only unified-sync-v2 remains."
