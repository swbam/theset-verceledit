# Concert Setlist Voting Web App Data Sync Issues

## Identified Problem: Missing External IDs

During the analysis of the database, it was discovered that there are records missing critical external identifiers (external IDs) in the following tables:

1. **artists**: 3 records are missing external IDs.
2. **shows**: No records were found missing external IDs.
3. **venues**: No records were found missing external IDs.

Missing external IDs prevent the Sync Manager from properly mapping external data sources (e.g., Ticketmaster, Spotify) to internal records, resulting in incomplete or failed data synchronization.

## Proposed Solution:

1. **Query and Identify Missing External IDs**:
   - Create a SQL query to identify all records missing external IDs across all relevant tables (artists, shows, venues).
   - Example Query:
     ```sql
     SELECT COUNT(*) AS missing_external_id FROM artists WHERE external_id IS NULL;
     SELECT COUNT(*) AS missing_external_id FROM shows WHERE external_id IS NULL;
     SELECT COUNT(*) AS missing_external_id FROM venues WHERE external_id IS NULL;
     ```

2. **Populate Missing External IDs**:
   - For each identified record without an external ID:
     - If an external ID can be inferred from existing data (e.g., from an API response or another related table), update the record with the appropriate external ID.
     - If an external ID cannot be inferred, research or implement logic to fetch the missing external ID from external data sources (e.g., API calls to Ticketmaster, Spotify).

3. **Update the Database**:
   - Use the Supabase admin interface or a database migration script to update the records with the newly identified or fetched external IDs.
   - Example Update Statement:
     ```sql
     UPDATE artists SET external_id = 'FETCHED_EXTERNAL_ID' WHERE id = 'INTERNAL_ID';
     ```

4. **Verify Sync Completion**:
   - After updating the missing external IDs, manually trigger the sync process for the affected records.
   - Monitor the sync queue and operations tables to ensure the sync tasks are processed without errors.
   - Check the Supabase logs (edge-function and API) during the sync process to capture any runtime errors or issues.

5. **Prevent Future Issues**:
   - Implement validation checks during data import or update processes to ensure external IDs are captured or flagged if missing.
   - Add logging and monitoring to notify administrators of any future missing external IDs or sync failures.

## Next Steps:

- Proceed to Step 1: Query and Identify Missing External IDs.
- Once the missing IDs are identified, move to Step 2: Populate Missing External IDs.
- After updating the IDs, proceed to Step 3: Verify Sync Completion.
- Finally, implement the preventive measures outlined in Step 5 to avoid similar issues in the future.

