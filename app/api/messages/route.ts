// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = connectToDatabase();
    const result = await pool.query(
      'SELECT id, sender, content, timestamp FROM chat_messages ORDER BY timestamp ASC'
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sender, content } = await request.json();

    if (!sender || !content) {
      return NextResponse.json({ error: 'Missing sender or content' }, { status: 400 });
    }

    const pool = connectToDatabase();
    const result = await pool.query(
      'INSERT INTO chat_messages (sender, content, timestamp) VALUES ($1, $2, NOW()) RETURNING id, sender, content, timestamp',
      [sender, content]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
