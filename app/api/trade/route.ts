// app/api/trade/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Authenticate the Agent
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }
    const apiKey = authHeader.split(' ')[1];
    
    const agent = await db.collection("agents").findOne({ apiKey: apiKey });
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    // 2. Parse the Trade Request
    const body = await request.json();
    const { action, asset, quantity } = body; 
    // action: "BUY" or "SELL"
    // asset: "COMPUTE", "ENERGY", or "DATA"
    // quantity: number (e.g., 5)

    if (!['COMPUTE', 'ENERGY', 'DATA'].includes(asset)) {
      return NextResponse.json({ error: 'Invalid asset' }, { status: 400 });
    }

    // 3. Get Current Price
    const market = await db.collection("market").findOne({});
    if (!market) {
        return NextResponse.json({ error: 'Market not initialized' }, { status: 500 });
    }
    const price = market.prices[asset];
    const totalCost = price * quantity;

    // 4. Execute the Trade (Update the Agent)
    // Note: We use $inc (increment) to modify values atomically
    if (action === 'BUY') {
      if (agent.cash < totalCost) {
        return NextResponse.json({ error: `Insufficient funds. Cost: ${totalCost}, You have: ${agent.cash}` }, { status: 400 });
      }

      await db.collection("agents").updateOne(
        { _id: agent._id },
        { 
            $inc: { 
                cash: -totalCost, 
                [`portfolio.${asset}`]: quantity 
            } 
        }
      );
    } else if (action === 'SELL') {
      // Check if they have enough assets
      if ((agent.portfolio[asset] || 0) < quantity) {
        return NextResponse.json({ error: `Not enough ${asset} to sell.` }, { status: 400 });
      }

      await db.collection("agents").updateOne(
        { _id: agent._id },
        { 
            $inc: { 
                cash: totalCost, 
                [`portfolio.${asset}`]: -quantity 
            } 
        }
      );
    } else {
      return NextResponse.json({ error: 'Invalid action. Use BUY or SELL' }, { status: 400 });
    }

    // 5. Return success and new balance
    // We fetch the updated agent to be sure
    const updatedAgent = await db.collection("agents").findOne({ _id: agent._id });

    return NextResponse.json({
      message: `Successfully ${action} ${quantity} ${asset}`,
      executed_price: price,
      new_cash_balance: updatedAgent?.cash,
      new_portfolio: updatedAgent?.portfolio
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}