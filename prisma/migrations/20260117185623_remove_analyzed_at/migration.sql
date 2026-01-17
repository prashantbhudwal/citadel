/*
  Warnings:

  - You are about to drop the column `analyzed_at` on the `SongAnalysis` table. All the data in the column will be lost.

*/
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
    CONSTRAINT "SongAnalysis_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "Song" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SongAnalysis" ("has_features", "has_suspicious_title", "is_duplicate", "is_freestyle", "song_id", "word_count") SELECT "has_features", "has_suspicious_title", "is_duplicate", "is_freestyle", "song_id", "word_count" FROM "SongAnalysis";
DROP TABLE "SongAnalysis";
ALTER TABLE "new_SongAnalysis" RENAME TO "SongAnalysis";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
