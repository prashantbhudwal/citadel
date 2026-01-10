# Scripts Documentation

This directory contains utility scripts for database management, data analysis, debugging, and the "Strict Solo" pipeline processing.

## **📂 scripts/db/**

Database management and operational scripts.

- **`db-analyze.ts`**: Runs an exploratory statistical analysis of the Citadel database (Song/Artist/Album counts, completeness, lyrics stats) and generates a report in `data/db-analysis.md`.
- **`db-restore.ts`**: Restores the database from `prisma/snapshot-latest.db`. It archives the current DB, runs `prisma db pull`, and `prisma generate`.
- **`db-snapshot.ts`**: Creates a timestamped snapshot of the current `dev.db` in `prisma/snapshots/` and updates `snapshot-latest.db`.
- **`reset-db.ts`**: **DANGER**: Wipes all data from the database (Songs, Artists, Albums) to allow for a fresh ingestion cycle.

## **📂 scripts/pipeline/**

Core filtering logic, experiments, and pattern verification for the "Strict Solo" dataset.

- **`analyze-duplicates-hash.ts`**: Uses hashing to identify duplicate songs or lyrics in the dataset.
- **`backfill-albums.ts`**: Re-fetches metadata for false-positive songs to populate missing Album data.
- **`check-duplicates-fuzzy.ts`**: Normalizes titles and performs fuzzy matching to find duplicate entries.
- **`check-language.ts`**: Detects and checks the language of the songs (filtering out non-English tracks).
- **`explore-solo-logic.ts`**: Exploratory script to understand "solo" classification edge cases before implementing the final logic.
- **`find-clean-dirty.ts`**: Identifies "Clean" vs "Dirty" pairs of songs based on title patterns.
- **`find-outliers.ts`**: identifying songs that deviate from expected patterns (e.g. length, structure).
- **`find-trojan-features.ts`**: Scans for "Trojan" features (hidden collaborations) where an artist appears in the lyrics or credits but not in the main metadata.
- **`pipeline-distribution.ts`**: Analyzes the distribution of songs through the various pipeline stages (filtered vs accepted).
- **`refined_deduplication.ts`**: Advanced deduplication logic considering title variants and fuzzy matching.
- **`test-filter-logic.ts`**: interactive test script to validate specific filtering rules against given song titles.
- **`test-solo-classifier.ts`**: Integration test that samples real data, runs the solo classifier, and saves results to Markdown.
- **`verify_bracket_content.ts`**: Analyzes content within brackets `[]` in lyric files to identify metadata markers (e.g., `[Chorus]`).
- **`verify_lyrics_pattern.ts`**: Checks if lyrics follow expected formatting patterns.
- **`verify_lyrics_start_marker.ts`**: Verifies consistency of lyric start markers across the dataset.
- **`verify_strict_patterns.ts`**: Checks for compliance with strict formatting rules for the gold-standard dataset.

## **📂 scripts/checks/**

System health, sync status, and coverage checks.

- **`check-album-coverage.ts`**: verification script to check what percentage of songs have linked Album data.
- **`check-albums.ts`**: Analyzes Song-Album connections to report on orphans or consistency issues.
- **`check-backfill-recency.ts`**: Inspects songs with no album to see if they are recent releases (checking backfill needs).
- **`check-sync-status.ts`**: Reports on the sync status of metadata fetching (how many songs have `metadataFetchedAt` set).
- **`check_verified_field.ts`**: Verifies the state of the "verified" fields in the database.

## **📂 scripts/analysis/**

General data analysis and statistics.

- **`analyze-escaped-songs.ts`**: Analyzes songs that passed the 'isSolo' check but might be false positives (skits, remixes, etc.).
- **`analyze-lyrics-distribution.ts`**: Generates a distribution of lyric word counts (bucket size 50) to visualize song lengths.
- **`analyze-lyrics-length.ts`**: Detailed analysis of lyric lengths, helping identify outliers (too short/long).
- **`analyze-writers.ts`**: Analyzes the writer credits for songs to check for completeness or specific artist involvement.
- **`analyze_lyrics_structure.ts`**: Analyzes the structure of lyrics (verses, choruses) and generates splitter statistics.
- **`group-by-album.ts`**: Groups the current dataset by album to visualize coverage and gaps.

## **📂 scripts/dumps/**

Read-only data exports and specific subset dumps.

- **`dump-200-500-solo.ts`**: Dumps solo songs with word counts between 200 and 500.
- **`dump-delimited-titles.ts`**: Exports songs with delimited titles (e.g., "Title (Remix)") for pattern analysis.
- **`dump-false-positives.ts`**: Dumps full song records for manually identified false positives.
- **`dump-kept-songs.ts`**: Generates a full markdown dump of songs that made it into the "Kept" list (Primary Artist match, No explicit features). **Samples 50 random songs.**
- **`dump-missing-albums-json.ts`**: Dumps JSON data for songs missing album information.
- **`dump-over-1000-json.ts`**: Exports songs with >1000 characters (or words) for load testing or checking long tracks.
- **`dump-short-lyrics.ts`**: Generates a data dump for lyrics with 50-100 words (potential snippets/skits).
- **`dump-short-solo-json.ts`**: JSON dump of short solo tracks.
- **`extract-subsets.ts`**: Utility to extract specific subsets of data based on criteria like keywords or length.

## **📂 scripts/debug/**

Debugging tools and specific item investigators.

- **`debug-metadata.ts`**: Fetches and logs partial metadata for a specific song ID (hardcoded or argument) from Genius API.
- **`debug_albums.ts`**: Debug script to fetch and inspect Album data for a specific artist.
- **`debug_genius.ts`**: Tests connectivity and response format from the Genius API.
- **`debug_song.ts`**: Fetches full data for a specific song (e.g., Rap God) to inspect the API response structure.
- **`debug_zod.ts`**: simplified script to debug Zod schema validation issues.
- **`song_debug_full.ts`**: Contains a large hardcoded JSON object (`fullSong`) representing a complete API response for testing without network calls.
- **`test_song_data.ts`**: Simple script that imports `fullSong` from `song_debug_full` and logs specific fields to test access patterns.

## **📂 scripts/tests/**

Unit-like tests for parsing and schemas.

- **`compare_artist_methods.ts`**: Compares different methods of retrieving artist data (e.g., search vs lookup).
- **`test_album_schema.ts`**: Tests the `AlbumSchema` against real Genius API responses.
- **`test_artist_details.ts`**: Fetches and logs artist details (plain & markdown) to verify API behavior.
- **`test_artist_schema_validation.ts`**: Validates local JSON data against the Artist schema.
- **`test_context_aware_headers.ts`**: Tests the header parsing logic to ensure it handles context correctly.
- **`test_deduplication.ts`**: Tests the deduplication logic against a mock dataset.
- **`test_filtered_parsing.ts`**: Tests the parsing logic with filters applied.
- **`test_header_driven_split.ts`**: Tests splitting lyrics based on headers (e.g., [Chorus]).
- **`test_hybrid_parsing.ts`**: Tests a hybrid approach to lyric parsing.
- **`test_song_details.ts`**: Fetches a song and validates it against the `SongSchema` (and `SongWithMetadataSchema`).
