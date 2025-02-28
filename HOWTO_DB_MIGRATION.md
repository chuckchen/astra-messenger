## How to properly do DB migration with Prisma and Cloudflare D1

Since Cloudflare D1 is not officially supported yet, all migrations should be done with Cloudflare Wrangler.

Update `[./prisma/schema.prisma](./prisma/schema.prisma)`.

Then create a new migration:

```sh
pnpm wrangler d1 migrations create <DB> name_of_migration
```

Followed by a `prisma diff` to generate

```sh
pnpm prisma migrate diff --from-local-d1 --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/20250205145601_name_of_migration.sql
```

This creates create the migration script to update database to the design in Prisma schema file. Next apply it in local first.

```sh
pnpm wrangler d1 migrations apply messenger --local
```

If everything is okay, go ahead to apply the migration to remote.

```sh
pnpm wrangler d1 migrations apply messenger --remote
```
