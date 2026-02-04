// app/api/market/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { WithId, Document } from 'mongodb';

// 1. Define what our Market data looks like
interface MarketState {
  tick: number;
  news: string;
  prices: {
    COMPUTE: number;
    ENERGY: number;
    DATA: number;
  };
  lastUpdated: Date;
}

// 2. Define what a News Event looks like
interface NewsEvent {
  news: string;
  impact: {
    COMPUTE: number;
    ENERGY: number;
    DATA: number;
  };
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const marketCollection = db.collection<MarketState>("market"); // Tell Mongo this collection holds MarketState

    // 1. Get the current market state
    let market = await marketCollection.findOne({});

    // 2. If no market exists (first run), create it
    if (!market) {
      const initialMarket: MarketState = {
        tick: 0,
        news: "Market opens. Trading is quiet.",
        prices: { COMPUTE: 100, ENERGY: 50, DATA: 20 },
        lastUpdated: new Date()
      };
      
      const result = await marketCollection.insertOne(initialMarket);
      
      // We manually construct the market object because insertOne returns an InsertOneResult, not the document
      market = { ...initialMarket, _id: result.insertedId } as WithId<MarketState>;
    }

    // 3. Check if we need to update prices (Simulate time passing)
    const now = new Date();
    // Use optional chaining just in case, though our type says it exists
    const lastUpdate = new Date(market.lastUpdated); 
    const diffSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;

    if (diffSeconds > 15) {
        // === SIMULATE MARKET MOVEMENT ===
        const events: NewsEvent[] = [
            { news: "AI Boom! Demand for Compute skyrockets.", impact: { COMPUTE: 1.2, ENERGY: 1.1, DATA: 1.0 } },
            { news: "Energy crisis strikes server farms.", impact: { COMPUTE: 0.8, ENERGY: 1.5, DATA: 1.0 } },
            { news: "Data privacy laws restrict scraping.", impact: { COMPUTE: 1.0, ENERGY: 1.0, DATA: 1.5 } },
            { news: "Quiet trading day.", impact: { COMPUTE: 1.0, ENERGY: 1.0, DATA: 1.0 } },
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];

        // Calculate new prices
        const newPrices = {
            COMPUTE: Number(Math.max(10, (market.prices.COMPUTE * event.impact.COMPUTE)).toFixed(2)),
            ENERGY: Number(Math.max(10, (market.prices.ENERGY * event.impact.ENERGY)).toFixed(2)),
            DATA: Number(Math.max(10, (market.prices.DATA * event.impact.DATA)).toFixed(2)),
        };

        // Update the DB
        await marketCollection.updateOne(
            { _id: market._id },
            { 
                $set: { 
                    prices: newPrices,
                    news: event.news,
                    lastUpdated: now,
                    tick: market.tick + 1
                } 
            }
        );

        // Update our local variable to return the new data
        market.prices = newPrices;
        market.news = event.news;
        market.tick += 1;
        market.lastUpdated = now;
    }

    return NextResponse.json({
      tick: market.tick,
      news: market.news,
      prices: market.prices,
      last_update: market.lastUpdated
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}