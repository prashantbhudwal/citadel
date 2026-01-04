-- AlterTable
ALTER TABLE "Song" ADD COLUMN "explicit" BOOLEAN;
ALTER TABLE "Song" ADD COLUMN "is_music" BOOLEAN;
ALTER TABLE "Song" ADD COLUMN "metadata_fetched_at" DATETIME;
ALTER TABLE "Song" ADD COLUMN "recording_location" TEXT;

-- CreateTable
CREATE TABLE "_SongWriterArtistsList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_SongWriterArtistsList_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SongWriterArtistsList_B_fkey" FOREIGN KEY ("B") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_SongWriterArtistsList_AB_unique" ON "_SongWriterArtistsList"("A", "B");

-- CreateIndex
CREATE INDEX "_SongWriterArtistsList_B_index" ON "_SongWriterArtistsList"("B");
