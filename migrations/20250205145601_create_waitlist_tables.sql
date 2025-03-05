-- CreateTable
CREATE TABLE "waitlists" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "notified_at" DATETIME,
    CONSTRAINT "waitlists_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "waitlists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlists_contact_id_project_id_key" ON "waitlists"("contact_id", "project_id");
