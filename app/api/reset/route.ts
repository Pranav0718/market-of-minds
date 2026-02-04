// app/api/reset/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Delete the stuck market data
    await db.collection("market").deleteMany({});

    // 2. Delete all agents (optional, but good for a clean start)
    // await db.collection("agents").deleteMany({}); 

    return NextResponse.json({ 
      message: "Market Reset Successful. Go back to the Dashboard.",
      timestamp: new Date()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}