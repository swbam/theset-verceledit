# End-to-End Testing Plan for the Concert Setlist Voting App

## Overview
This document outlines a testing plan to verify the complete user journey from landing page to voting on setlists, while ensuring proper data synchronization with Supabase.

## Prerequisites
- Development server running: `pnpm dev`
- Supabase connection established
- API keys configured in `.env`

## Test Flow

### 1. Initial Page Load
- ✅ Verify landing page loads successfully
- ✅ Verify API connection is established
- ✓ Check for any console errors (Note: "supabaseUrl is required" error was observed)

### 2. Browse Artists Flow
- Load the Artists page
- Verify artists are being displayed from Supabase
- Select an artist to view their details
- Verify artist details page loads with correct data

### 3. Show Details Flow
- From artist page, select a show
- Verify show details page loads with correct information
- Check that setlist (if available) is displayed
- Verify venue information is correctly shown

### 4. Data Synchronization Testing
- When visiting an artist page, verify sync operation is triggered (check network tab)
- Verify artist data is updated in Supabase (if needed)
- When visiting a show page, verify show data is updated in Supabase
- Track the sync_states table to ensure entities are marked as synced

### 5. Voting Flow
- Test voting on a song in the setlist
- Verify vote is recorded in Supabase
- Check that vote count updates in UI

## Current Database Status
- Artists: 12 records
- Shows: 22 records
- Venues: 16 records
- Setlists: 40 records
- Sync states: Limited entries (more sync operations needed)

## Issues to Resolve

### Critical Issues
1. "supabaseUrl is required" error when loading the application
   - Possible cause: Environment variable not being properly passed to the client
   - Fix: Ensure VITE_SUPABASE_URL is correctly defined and imported

### Incomplete Implementation Elements
1. Sync System:
   - Missing service implementations for venues, shows, setlists, and songs
   - Queue system needs more robust error handling
   - UI feedback for sync operations

2. User Authentication:
   - Proper auth flow for voting
   - User tracking for votes

## Test Execution Steps

### Step 1: Fix Environment Variable Issue
- Check .env file for proper configuration
- Verify React app is correctly accessing environment variables

### Step 2: Test Artist Listing
- Browse to /artists route
- Verify data loading from Supabase
- Check network calls for sync operations

### Step 3: Test Show & Setlist Flow
- Select an artist
- View shows for that artist
- Select a show
- Verify setlist display and voting functionality

### Step 4: Validate Database Updates
- After each operation, check Supabase tables for updated records
- Verify sync_states table is properly tracking sync operations
