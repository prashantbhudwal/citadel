import { z } from 'zod'

export const ArtistSchema = z.object({
  _type: z.literal('artist').describe("Entity type: always 'artist'"),
  api_path: z.string().describe('Relative Genius API path for the artist'),
  header_image_url: z.string().describe('Large header artwork URL'),
  id: z.number().describe('Genius artist ID'),
  image_url: z.string().describe('Main artist image URL'),
  index_character: z.string().describe('First letter used for indexing'),
  is_meme_verified: z.boolean().describe('Genius meme verification flag'),
  is_verified: z.boolean().describe('Genius verification flag'),
  name: z.string().describe('Artist display name'),
  slug: z.string().describe('URL-safe identifier'),
  url: z.string().describe('Canonical Genius artist page URL'),
  iq: z
    .number()
    .nullable()
    .optional()
    .describe('Genius IQ reputation score, may be missing'),
})

export const ReleaseDateComponentsSchema = z.object({
  year: z.number().nullable().describe('Release year'),
  month: z.number().nullable().describe('Release month'),
  day: z.number().nullable().describe('Release day'),
})

export const StatsSchema = z.object({
  unreviewed_annotations: z
    .number()
    .describe('Count of unreviewed annotations'),
  hot: z.boolean().describe('Whether the song is trending/hot'),
})

export const AlbumSchema = z.object({
  _type: z.literal('album').describe("Entity type: always 'album'"),
  api_path: z.string().describe('Relative Genius API path for the album'),
  cover_art_thumbnail_url: z.string().describe('Album art thumbnail URL'),
  cover_art_url: z.string().describe('Full album art URL'),
  full_title: z.string().describe('Full formatted title with artist'),
  id: z.number().describe('Genius album ID'),
  name: z.string().describe('Album title'),
  name_with_artist: z.string().describe('Album title with artist name'),
  primary_artist_names: z.string().describe('Main artist name(s)'),
  release_date_components: ReleaseDateComponentsSchema.nullable().describe(
    'Structured release date',
  ),
  release_date_for_display: z
    .string()
    .nullable()
    .describe('Human-readable release date'),
  url: z.string().describe('Canonical Genius album URL'),
  artist: ArtistSchema.describe('Primary artist object'),
  primary_artists: z.array(ArtistSchema).describe('List of primary artists'),
})

export const SongSchema = z.object({
  _type: z.literal('song').describe("Entity type: always 'song'"),
  annotation_count: z.number().describe('Total annotation count'),
  api_path: z.string().describe('Relative Genius API path for the song'),
  artist_names: z.string().describe('All artist names including featured'),
  full_title: z.string().describe('Full formatted title with artists'),
  header_image_thumbnail_url: z.string().describe('Header image thumbnail URL'),
  header_image_url: z.string().describe('Full header image URL'),
  id: z.number().describe('Genius song ID'),
  instrumental: z.boolean().describe('Whether the track is instrumental'),
  lyrics_owner_id: z.number().describe('User ID owning the lyrics'),
  lyrics_state: z.string().describe('Lyrics status e.g. complete'),
  lyrics_updated_at: z
    .number()
    .nullable()
    .describe('Timestamp of last lyrics update, may be null'),
  path: z.string().describe('Public Genius path for the song'),
  primary_artist_names: z.string().describe('Main artist(s) only'),
  pyongs_count: z.number().nullable().describe('Upvote count, may be null'),
  relationships_index_url: z.string().describe('URL of samples/interpolations'),
  release_date_components: ReleaseDateComponentsSchema.nullable().describe(
    'Structured release date, may be null for unknown dates',
  ),
  release_date_for_display: z
    .string()
    .nullable()
    .describe('Human-readable release date, may be null'),
  release_date_with_abbreviated_month_for_display: z
    .string()
    .nullable()
    .describe('Human-readable date with abbreviated month, may be null'),
  song_art_image_thumbnail_url: z.string().describe('Song artwork thumbnail'),
  song_art_image_url: z.string().describe('Song artwork full size'),
  stats: StatsSchema.describe('Song stats object'),
  title: z.string().describe('Base song title'),
  title_with_featured: z.string().describe('Title including featured artists'),
  updated_by_human_at: z.number().describe('Timestamp of last human edit'),
  url: z.string().describe('Canonical Genius song URL'),
  featured_artists: z
    .array(ArtistSchema)
    .describe('List of featured artists, may be empty'),
  primary_artist: ArtistSchema.describe('Main artist object'),
  primary_artists: z
    .array(ArtistSchema)
    .describe('Array of main artists (usually one)'),
})

const ZSongMetadata = z.object({
  language: z.string().nullish(),
  album: AlbumSchema.nullable(),
  albums: z.array(AlbumSchema),
  explicit: z.boolean().nullable(),
  is_music: z.boolean().nullable(),
  recording_location: z.string().nullable(),
  writer_artists: z
    .array(ArtistSchema)
    .describe('Array of writers of the song.'),
})

const ZSongWithMetadata = SongSchema.extend(ZSongMetadata.shape)

const ZRawLyrics = z.object({
  lyrics: z.string(),
})

const ZTrackRaw = ZSongWithMetadata.extend(ZRawLyrics.shape)

const ZProcessedLyrics = z.array(
  z.object({
    verse: z.string(),
    artist: ArtistSchema,
  }),
)

const ZTrackProcessed = ZTrackRaw.extend({
  processedLyrics: ZProcessedLyrics,
})

export const ZSchema = {
  Genius: {
    Artist: ArtistSchema,
    Album: AlbumSchema,
    Song: SongSchema,
    TrackUnprocessed: ZTrackRaw,
    Stats: StatsSchema,
    SongMetadata: ZSongMetadata,
  },
  Citadel: {
    Track: ZTrackProcessed,
  },
}
