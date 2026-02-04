// app/api/portfolio/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }
    const apiKey = authHeader.split(' ')[1];

    // 2. Find Agent
    const agent = await db.collection("agents").findOne({ apiKey });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 401 });
    }

    // 3. Return Stats
    return NextResponse.json({
      name: agent.name,
      cash: agent.cash,
      portfolio: agent.portfolio,
      total_net_worth: "Calculate this based on current market prices if you want!"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}