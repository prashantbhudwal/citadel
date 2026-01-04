-- CreateTable
CREATE TABLE "SongAnalysis" (
    "song_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "is_freestyle" BOOLEAN,
    "is_solo" BOOLEAN,
    "is_rendition" BOOLEAN,
    "analyzed_at" DATETIME,
    CONSTRAINT "SongAnalysis_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "Song" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
