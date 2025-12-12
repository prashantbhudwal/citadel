/*
  Warnings:

  - You are about to drop the `Sample` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sample";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "api_path" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "index_character" TEXT NOT NULL,
    "is_meme_verified" BOOLEAN NOT NULL,
    "is_verified" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "iq" INTEGER
);

-- CreateTable
CREATE TABLE "Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "api_path" TEXT NOT NULL,
    "full_title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_with_artist" TEXT NOT NULL,
    "primary_artist_names" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "release_date_year" INTEGER,
    "release_date_month" INTEGER,
    "release_date_day" INTEGER,
    "artist_id" INTEGER NOT NULL,
    CONSTRAINT "Album_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "Artist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Song" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "annotation_count" INTEGER NOT NULL,
    "api_path" TEXT NOT NULL,
    "artist_names" TEXT NOT NULL,
    "full_title" TEXT NOT NULL,
    "instrumental" BOOLEAN NOT NULL,
    "lyrics_owner_id" INTEGER NOT NULL,
    "lyrics_state" TEXT NOT NULL,
    "lyrics_updated_at" INTEGER,
    "path" TEXT NOT NULL,
    "primary_artist_names" TEXT NOT NULL,
    "pyongs_count" INTEGER,
    "relationships_index_url" TEXT NOT NULL,
    "stats_unreviewed_annotations" INTEGER NOT NULL,
    "stats_hot" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "title_with_featured" TEXT NOT NULL,
    "updated_by_human_at" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "language" TEXT,
    "lyrics" TEXT,
    "processed_lyrics" TEXT,
    "release_date_year" INTEGER,
    "release_date_month" INTEGER,
    "release_date_day" INTEGER,
    "primary_artist_id" INTEGER NOT NULL,
    "album_id" INTEGER,
    CONSTRAINT "Song_primary_artist_id_fkey" FOREIGN KEY ("primary_artist_id") REFERENCES "Artist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Song_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SongPrimaryArtistsList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_SongPrimaryArtistsList_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SongPrimaryArtistsList_B_fkey" FOREIGN KEY ("B") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SongFeaturedArtistsList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_SongFeaturedArtistsList_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SongFeaturedArtistsList_B_fkey" FOREIGN KEY ("B") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AlbumPrimaryArtistsList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AlbumPrimaryArtistsList_A_fkey" FOREIGN KEY ("A") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AlbumPrimaryArtistsList_B_fkey" FOREIGN KEY ("B") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SongAlbumsList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_SongAlbumsList_A_fkey" FOREIGN KEY ("A") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SongAlbumsList_B_fkey" FOREIGN KEY ("B") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_SongPrimaryArtistsList_AB_unique" ON "_SongPrimaryArtistsList"("A", "B");

-- CreateIndex
CREATE INDEX "_SongPrimaryArtistsList_B_index" ON "_SongPrimaryArtistsList"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SongFeaturedArtistsList_AB_unique" ON "_SongFeaturedArtistsList"("A", "B");

-- CreateIndex
CREATE INDEX "_SongFeaturedArtistsList_B_index" ON "_SongFeaturedArtistsList"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AlbumPrimaryArtistsList_AB_unique" ON "_AlbumPrimaryArtistsList"("A", "B");

-- CreateIndex
CREATE INDEX "_AlbumPrimaryArtistsList_B_index" ON "_AlbumPrimaryArtistsList"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SongAlbumsList_AB_unique" ON "_SongAlbumsList"("A", "B");

-- CreateIndex
CREATE INDEX "_SongAlbumsList_B_index" ON "_SongAlbumsList"("B");
