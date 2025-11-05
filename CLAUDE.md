# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astra Messenger is a serverless email microservice built on Cloudflare Workers that provides:
- Multi-provider email sending (AWS SES, Resend, MailerSend)
- Template management with variable substitution
- Contact and waitlist management
- Per-template opt-out/blacklist functionality

## Commands

```bash
# Development
pnpm dev                  # Start local dev server on port 8787 with scheduled tasks
pnpm test                 # Run tests (when available)

# Database
pnpm prisma:generate      # Generate Prisma client
pnpm prisma:migrate       # Run migrations locally
pnpm prisma:migrate:prod  # Run migrations in production
pnpm prisma:studio        # Open Prisma Studio for DB management

# Deployment
pnpm deploy               # Deploy to Cloudflare Workers (production)
pnpm cf-typegen           # Generate Cloudflare types

# Code Quality
pnpm lint                 # Run ESLint
pnpm format               # Format code with Prettier
```

## Architecture

### Core Technology Stack
- **Runtime**: Cloudflare Workers (serverless edge)
- **Framework**: Hono (lightweight web framework)
- **Database**: Cloudflare D1 (SQLite) with Prisma ORM
- **Language**: TypeScript with strict configuration
- **Email Providers**: AWS SES, Resend, MailerSend (configurable)

### Key Services & Patterns

**EmailService** (`src/email/emails.ts`)
- Main orchestrator for sending emails via templates or direct content
- Checks opt-outs before sending, supports batch recipients
- Uses Cloudflare's `waitUntil` for non-blocking async email operations

**TemplateService** (`src/email/templates.ts`)
- Fetches templates from database, processes `{{variable}}` substitutions
- Templates stored in DB, not code - managed via API endpoints

**TemplateOptOutService** (`src/optout/optout-service.ts`)
- Manages per-template email blacklisting
- Uses Prisma transactions for atomic operations

**Email Provider System**
- Provider interface abstraction allows switching via `EMAIL_PROVIDER` env var
- Current default: MailerSend (recently switched from AWS SES)
- Each provider in `src/lib/` implements common interface

### Database Schema

Key models with relationships:
- **Contact**: User emails with tags
- **Template**: Email templates with variables and metadata
- **Message**: Sent email records with status tracking
- **TemplateOptOut**: Per-template blacklist (M-N Contact-Template)
- **Project**: Multi-tenancy support
- **Waitlist**: Waitlist management with status

### API Structure

All endpoints under `/api/v1` require `X-API-Key` header authentication:

**Email Operations**
- `POST /emails` - Send with template or direct content
- Supports batch recipients, variable substitution

**Opt-Out Management**
- `POST /optouts` - Add to blacklist
- `DELETE /optouts/:email` - Remove from blacklist

## Environment Configuration

Required environment variables:
```env
# Database (auto-configured in wrangler.toml)
DB                      # D1 database binding

# Email Providers
EMAIL_PROVIDER          # 'aws-ses' | 'resend' | 'mailersend'
AWS_ACCESS_KEY_ID       # For AWS SES
AWS_SECRET_ACCESS_KEY   # For AWS SES
AWS_REGION              # For AWS SES
RESEND_API_KEY          # For Resend
MAILERSEND_API_KEY      # For MailerSend

# Security
API_AUTH_TOKEN          # API authentication key
```

## Development Workflow

### Database Migrations
When modifying `prisma/schema.prisma`:
1. Create migration: `pnpm wrangler d1 migrations create messenger <name>`
2. Generate SQL: Use Prisma migrate diff
3. Test locally: `pnpm wrangler d1 migrations apply messenger --local`
4. Deploy: `pnpm wrangler d1 migrations apply messenger --remote`

See `HOWTO_DB_MIGRATION.md` for detailed steps.

### Adding New Email Provider
1. Create provider in `src/lib/<provider>-client.ts`
2. Implement common email provider interface
3. Add to provider factory in `email-service.ts`
4. Update environment configuration

## Important Patterns

**Async Email Sending**: Non-blocking operations using `c.executionCtx.waitUntil()`
**Transaction Handling**: Prisma `$transaction` for atomic opt-out operations
**Template Variables**: `{{variableName}}` syntax with regex replacement
**Error Handling**: Global middleware, provider failures logged but don't block responses

## Recent Changes

- Switched default provider from AWS SES to MailerSend
- Added List-Unsubscribe header support for Resend
- Fixed MailerSend API integration
- Environment variables configuration updated