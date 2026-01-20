-- CreateTable
CREATE TABLE "song_embeddings" (
    "songId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "vector" BLOB NOT NULL,
    "input_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,

    PRIMARY KEY ("songId", "model", "dimensions"),
    CONSTRAINT "song_embeddings_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "song_embeddings_model_dimensions_idx" ON "song_embeddings"("model", "dimensions");
