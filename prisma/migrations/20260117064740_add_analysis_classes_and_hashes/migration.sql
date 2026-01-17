/*
  Warnings:

  - You are about to drop the column `is_rendition` on the `SongAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `is_solo` on the `SongAnalysis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Song" ADD COLUMN "lyrics_hash" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SongAnalysis" (
    "song_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "is_freestyle" BOOLEAN,
    "word_count" INTEGER,
    "has_features" BOOLEAN,
    "has_suspicious_title" BOOLEAN,
    "is_duplicate" BOOLEAN,
    "analyzed_at" DATETIME,
    CONSTRAINT "SongAnalysis_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "Song" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SongAnalysis" ("analyzed_at", "is_freestyle", "song_id") SELECT "analyzed_at", "is_freestyle", "song_id" FROM "SongAnalysis";
DROP TABLE "SongAnalysis";
ALTER TABLE "new_SongAnalysis" RENAME TO "SongAnalysis";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
