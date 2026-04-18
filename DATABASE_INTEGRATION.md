# Chat App - Database Integration Guide

## Overview

The chat-app project has been integrated with the same PostgreSQL database architecture used in the misso-clinic project. This enables persistent message storage and retrieval from a real database.

## Architecture

### Database Layer

**File:** `lib/db.ts`

- Uses PostgreSQL `pg` library for connection pooling
- Automatically connects to database via `DATABASE_URL` environment variable
- Supports SSL connections (required for cloud databases like Render)
- Exports utility functions:
  - `connectToDatabase()` - Creates or reuses connection pool
  - `getPool()` - Returns existing pool or throws error
  - `closeDatabaseConnection()` - Closes connection pool

### API Routes

**File:** `app/api/messages/route.ts`

Implements RESTful endpoints:

- **GET /api/messages** - Fetches all messages ordered by timestamp
- **POST /api/messages** - Creates new message in database

### Frontend

**File:** `app/page.tsx`

- Loads messages on component mount via `useEffect`
- Sends new messages via fetch POST request
- Real-time state updates with database response data

## Database Schema

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

## Setup Instructions

### 1. Database Configuration

Update `.env.local`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/chat_app
```

### 2. Create Database

```bash
createdb chat_app
```

### 3. Run Migration

```bash
psql chat_app < migrations/001_create_messages_table.sql
```

### 4. Install Dependencies

```bash
npm install
```

## Integration with Misso-Clinic

### Shared Database Approach

The chat-app can share the same PostgreSQL database as misso-clinic:

1. **Same Database Instance**
   - Use the same `DATABASE_URL` pointing to misso-clinic's database
   - Create a separate `chat_messages` table to avoid conflicts

2. **Separate Database**
   - Create a new database for chat-app
   - Use the same PostgreSQL instance and credentials

### Example Shared Setup

If using the same database, update the schema:

```sql
-- In same database as misso-clinic
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Then update `app/api/messages/route.ts` to use `chat_messages` instead of `messages`.

## Running the Application

### Development

```bash
npm run dev
```

Server starts on `http://localhost:3000`

### Production

```bash
npm run build
npm start
```

## API Examples

### Fetch All Messages

```bash
curl http://localhost:3000/api/messages
```

### Send a Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"sender":"user","content":"Hello!"}'
```

## File Structure

```
chat-app/
├── app/
│   ├── api/
│   │   └── messages/
│   │       └── route.ts          # API endpoints
│   ├── page.tsx                   # Chat interface
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── db.ts                      # Database utilities
├── migrations/
│   └── 001_create_messages_table.sql
├── .env.local                     # Database URL
├── package.json
└── README.md
```

## Next Steps

1. **User Management**
   - Add user authentication (NextAuth.js)
   - Store user info in database
   - Associate messages with user IDs

2. **Real-Time Features**
   - Implement WebSocket support for live updates
   - Add typing indicators

3. **Data Enhancements**
   - Add message reactions
   - Enable message editing/deletion
   - Support file attachments

4. **Performance**
   - Add pagination for messages
   - Implement caching strategies
   - Optimize database queries

## Troubleshooting

### Connection Errors

- Verify `DATABASE_URL` in `.env.local`
- Check PostgreSQL service is running
- Ensure database and table exist

### API Errors

- Check browser console for fetch errors
- Review server logs in terminal
- Verify request body format (JSON)

### Type Errors

- Run `npm install @types/pg`
- Restart TypeScript server in VS Code

## References

- [PostgreSQL pg Library](https://node-postgres.com/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Database Connection Best Practices](https://node-postgres.com/features/connecting)
