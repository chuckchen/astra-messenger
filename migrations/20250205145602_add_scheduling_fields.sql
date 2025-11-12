-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "template_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error_details" TEXT,
    "variables" TEXT,
    "external_id" TEXT,
    "scheduled_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" DATETIME,
    "last_error" TEXT,
    "provider" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" DATETIME,
    CONSTRAINT "messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_messages" ("contact_id", "created_at", "error_details", "external_id", "id", "sent_at", "status", "template_id", "variables") SELECT "contact_id", "created_at", "error_details", "external_id", "id", "sent_at", "status", "template_id", "variables" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "templates_project_id_key_key" ON "templates"("project_id", "key");
