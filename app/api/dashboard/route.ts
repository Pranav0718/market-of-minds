// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const marketCollection = db.collection("market");

    // 1. Get Market
    let market: any = await marketCollection.findOne({});

    // Safety: Create if missing
    if (!market) {
      console.log("Creating fresh market...");
      market = {
        tick: 0,
        news: "Market opens.",
        prices: { COMPUTE: 100, ENERGY: 50, DATA: 20 },
        lastUpdated: new Date()
      };
      await marketCollection.insertOne(market);
    }

    // 2. RUN SIMULATION
    const now = new Date();
    // Safety: Ensure lastUpdated is a valid Date object, or default to epoch 0
    const lastUpdate = market.lastUpdated ? new Date(market.lastUpdated) : new Date(0); 
    
    const diffSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;

    // DEBUG LOG: Print this to your terminal to see the math!
    console.log(`Time since last update: ${diffSeconds.toFixed(1)}s (Threshold: 10s)`);

    // Update if 10 seconds have passed
    if (diffSeconds > 10) {
        console.log(">>> UPDATING MARKET PRICES <<<");
        
        const events = [
            { news: "Tech rally! Optimism is high.", impact: { COMPUTE: 1.1, ENERGY: 1.05, DATA: 1.1 } },
            { news: "Power outage in data center region.", impact: { COMPUTE: 0.9, ENERGY: 1.4, DATA: 1.0 } },
            { news: "New regulation hits data brokers.", impact: { COMPUTE: 1.0, ENERGY: 1.0, DATA: 0.7 } },
            { news: "Market stabilizes.", impact: { COMPUTE: 1.0, ENERGY: 1.0, DATA: 1.0 } },
        ];
        const event = events[Math.floor(Math.random() * events.length)];

        const newPrices = {
            COMPUTE: Number(Math.max(10, (market.prices.COMPUTE * event.impact.COMPUTE)).toFixed(2)),
            ENERGY: Number(Math.max(10, (market.prices.ENERGY * event.impact.ENERGY)).toFixed(2)),
            DATA: Number(Math.max(10, (market.prices.DATA * event.impact.DATA)).toFixed(2)),
        };

        // Update DB
        await marketCollection.updateOne(
            { _id: market._id },
            { 
                $set: { 
                    prices: newPrices,
                    news: event.news,
                    lastUpdated: now,
                    tick: (market.tick || 0) + 1
                } 
            }
        );

        // CRITICAL: Update the local variable so the Frontend sees the NEW data immediately
        market.prices = newPrices;
        market.news = event.news;
        market.tick = (market.tick || 0) + 1;
        market.lastUpdated = now;
    }

    // 3. Get Agents
    const agents = await db.collection("agents")
      .find({})
      .project({ apiKey: 0 }) 
      .toArray();

    return NextResponse.json({
      market: market,
      agents: agents
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error: any) {
    console.error("Dashboard Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}