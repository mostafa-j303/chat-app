-- SQL Migration: Create messages table
-- Run this in your PostgreSQL database to set up the chat messages table

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create an index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
