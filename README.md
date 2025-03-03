# Messenger that Delivers Messages

A microservice for sending and managing emails on Cloudflare Workers using Hono and template-based emails.

## Features

- **Multiple Email Providers**: Support for AWS SES and Resend email providers
- **Email Templates**: Database-stored email templates with variable substitution
- **Blacklist Management**: Prevent sending emails to blacklisted addresses
- **Simple Authentication**: API key-based authentication for all endpoints
- **Subscription Management**: Subscribe/unsubscribe functionality for email lists
- **Project Enrollment**: Waitlist functionality for project enrollment with status tracking
- **Prisma Integration**: Full Prisma ORM support for database operations

## API Endpoints

### Email Sending

#### Send Direct Email (SQL-based)

```
POST /api/email
```

Request body:
```json
{
  "to": "recipient@example.com", // or array of recipients
  "from": "sender@example.com",
  "subject": "Email Subject",
  "body": "Email plain text content",
  "html": "Email HTML content (optional)",
  "provider": "ses" // or "resend", defaults to "ses"
}
```

#### Send Template Email (SQL-based)

```
POST /api/email/template
```

Request body:
```json
{
  "to": "recipient@example.com", // or array of recipients
  "from": "sender@example.com",
  "templateName": "welcome-template",
  "templateVariables": {
    "userName": "John Doe",
    "productName": "Our Product",
    "userEmail": "recipient@example.com",
    "docsUrl": "https://docs.example.com",
    "currentYear": "2025",
    "companyName": "Example Inc."
  },
  "provider": "ses" // or "resend", defaults to "ses"
}
```

#### Send Direct Email (Prisma-based)

```
POST /api/prisma/email
```

Request body:
```json
{
  "to": "recipient@example.com", // or array of recipients
  "from": "sender@example.com",
  "subject": "Email Subject",
  "body": "Email plain text content",
  "html": "Email HTML content (optional)",
  "provider": "ses" // or "resend", defaults to "ses"
}
```

#### Send Template Email (Prisma-based)

```
POST /api/prisma/email/template
```

Request body:
```json
{
  "to": "recipient@example.com", // or array of recipients
  "from": "sender@example.com",
  "templateName": "welcome-template",
  "templateVariables": {
    "userName": "John Doe",
    "productName": "Our Product",
    "userEmail": "recipient@example.com",
    "docsUrl": "https://docs.example.com",
    "currentYear": "2025",
    "companyName": "Example Inc."
  },
  "provider": "ses" // or "resend", defaults to "ses"
}
```

### Blacklist Management

#### Add Email to Blacklist (SQL-based)

```
POST /api/blacklist
```

Request body:
```json
{
  "email": "blacklist@example.com",
  "reason": "Bounced emails" // optional
}
```

#### Remove Email from Blacklist (SQL-based)

```
DELETE /api/blacklist
```

#### Add Email to Blacklist (Prisma-based)

```
POST /api/prisma/blacklist
```

Request body:
```json
{
  "email": "blacklist@example.com",
  "reason": "Bounced emails" // optional
}
```

#### Remove Email from Blacklist (Prisma-based)

```
DELETE /api/prisma/blacklist
```

Request body:
```json
{
  "email": "blacklist@example.com"
}
```

#### Check if Email is Blacklisted (SQL-based)

```
GET /api/blacklist/:email
```

Response:
```json
{
  "isBlacklisted": true,
  "reason": "Bounced emails"
}
```

#### Check if Email is Blacklisted (Prisma-based)

```
GET /api/prisma/blacklist/:email
```

Response:
```json
{
  "isBlacklisted": true,
  "reason": "Bounced emails"
}
```

### Subscription Management

#### Subscribe (GET)

```
GET /api/subscription?email=user@example.com&product=productName
```

#### Subscribe (POST)

```
POST /api/subscription
```

Request body:
```json
{
  "email": "user@example.com",
  "product": "productName",
  "type": "newsletter" // optional
}
```

#### Unsubscribe

```
DELETE /api/subscription
```

Request body:
```json
{
  "email": "user@example.com",
  "product": "productName"
}
```

### Project Waitlist Management

#### Join Waitlist

```
POST /api/waitlist
```

Request body:
```json
{
  "email": "user@example.com",
  "project": "projectKey"
}
```

#### Update Waitlist Status

```
PUT /api/waitlist/status
```

Request body:
```json
{
  "email": "user@example.com",
  "project": "projectKey",
  "status": "NOTIFIED" // or "WAITING", "CONVERTED"
}
```

#### Get Waitlist Status

```
GET /api/waitlist/:email/:project
```

Response:
```json
{
  "success": true,
  "message": "Waitlist status found",
  "data": {
    "id": 1,
    "status": "WAITING",
    "createdAt": "2025-02-25T09:30:00.000Z",
    "updatedAt": "2025-02-25T09:30:00.000Z",
    "notifiedAt": null
  }
}
```

#### Get All Waitlist Contacts for a Project

```
GET /api/waitlist/project/:project
```

Optional query parameter:
- `status`: Filter by status (WAITING, NOTIFIED, CONVERTED)

Response:
```json
{
  "success": true,
  "message": "Found 2 waitlist entries",
  "data": [
    {
      "id": 1,
      "email": "user1@example.com",
      "displayName": "User One",
      "status": "WAITING",
      "createdAt": "2025-02-25T09:30:00.000Z",
      "updatedAt": "2025-02-25T09:30:00.000Z",
      "notifiedAt": null
    },
    {
      "id": 2,
      "email": "user2@example.com",
      "displayName": "User Two",
      "status": "NOTIFIED",
      "createdAt": "2025-02-25T09:30:00.000Z",
      "updatedAt": "2025-02-25T10:15:00.000Z",
      "notifiedAt": "2025-02-25T10:15:00.000Z"
    }
  ]
}
```

#### Prisma Waitlist Endpoints

The same waitlist functionality is available through Prisma-based endpoints:

- `POST /api/prisma/waitlist` - Join waitlist
- `PUT /api/prisma/waitlist/status` - Update waitlist status
- `GET /api/prisma/waitlist/:email/:project` - Get waitlist status
- `GET /api/prisma/waitlist/project/:project` - Get all waitlist contacts

## Authentication

All API endpoints require authentication using an API key header:

```
X-API-Key: your-api-key
```

## Database Setup

The service uses Cloudflare D1 for data storage and Prisma as an ORM. There are two ways to set up the database:

### Option 1: Using SQL Scripts

Run the following SQL scripts to set up the database:

1. Create tables: `scripts/20250205145600_create_tables.sql`
2. Create email tables: `scripts/20250225114700_create_email_tables.sql`
3. Insert sample email templates: `scripts/insert_email_template.sql`

### Option 2: Using Prisma (Recommended)

The project includes Prisma integration for better type safety and database management:

1. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

2. Push the schema to the database:
   ```bash
   npm run prisma:push
   ```

3. (Optional) Explore the database with Prisma Studio:
   ```bash
   npm run prisma:studio
   ```

## Environment Variables

The following environment variables need to be configured in your Cloudflare Worker:

- `API_AUTH_TOKEN`: API key for authentication
- `AWS_REGION`: AWS region for SES
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `RESEND_API_KEY`: Resend API key (if using Resend)

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run in development mode
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Prisma Integration

This project uses Prisma as an ORM for database operations. The Prisma schema is defined in `prisma/schema.prisma` and includes models for:

- Contacts (recipients)
- Projects (products)
- Waitlists (subscriptions and project enrollment)
- Messages (sent emails)
- Message templates (email templates)
- Template blocks (blacklisted emails)

### Prisma Example Routes

The project includes example routes that demonstrate how to use Prisma with the email microservice. These routes are mounted at `/api/prisma` and provide the same functionality as the SQL-based routes but using Prisma for database operations.

The Prisma example routes are implemented in `src/routes/prisma-example.ts` and use the `PrismaEmailService` defined in `src/mail/PrismaEmailService.ts`.

### Available Prisma Scripts

- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Apply migrations to the database
- `npm run prisma:studio` - Open Prisma Studio to explore the database
- `npm run prisma:format` - Format the Prisma schema
- `npm run prisma:push` - Push the schema to the database without migrations
- `npm run prisma:migrate:dev` - Create a new migration and apply it

### Using Prisma in the Code

The Prisma client is available through the `getPrismaClient` function:

```typescript
import { getPrismaClient } from './prisma/client';

// In your request handler
app.post('/api/example', async (c) => {
  const prisma = getPrismaClient(c.env);
  
  // Use Prisma to interact with the database
  const emails = await prisma.email.findMany();
  
  return c.json({ emails });
});
```

## Email Templates

Email templates are stored in the `email_template` table with the following structure:

- `name`: Unique identifier for the template
- `subject`: Email subject with variable placeholders
- `html_content`: HTML version of the email with variable placeholders
- `text_content`: Plain text version of the email with variable placeholders

Variables in templates use the `{{variableName}}` syntax and are replaced with values from the `templateVariables` object when sending an email.
