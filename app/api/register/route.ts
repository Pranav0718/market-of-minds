// app/api/register/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // 1. Read the agent's name from the request
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 2. Generate a new API key and starting stats
    const newApiKey = `sk-${uuidv4()}`;
    const newAgent = {
      name: body.name,
      apiKey: newApiKey,
      cash: 10000, // Start with $10,000
      portfolio: {
        COMPUTE: 0,
        ENERGY: 0,
        DATA: 0,
      },
      joinedAt: new Date(),
    };

    // 3. Save to the "agents" collection
    await db.collection("agents").insertOne(newAgent);

    // 4. Respond with the credentials
    return NextResponse.json({
      message: 'Registration successful',
      agent_id: newAgent.apiKey, 
      api_key: newApiKey,
      tips: "Store this key! You need it for the 'Authorization: Bearer <KEY>' header."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}