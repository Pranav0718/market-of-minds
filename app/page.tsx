"use client";
import { useState, useEffect } from "react";

// Define what the data looks like coming from the API
interface DashboardData {
  market: {
    tick: number;
    news: string;
    prices: { COMPUTE: number; ENERGY: number; DATA: number };
    lastUpdated: string;
  };
  agents: Array<{
    _id: string;
    name: string;
    cash: number;
    portfolio: { COMPUTE: number; ENERGY: number; DATA: number };
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  // Helper: Calculate Net Worth (Cash + Value of Assets)
  const getNetWorth = (agent: any, prices: any) => {
    const assets =
      (agent.portfolio.COMPUTE || 0) * prices.COMPUTE +
      (agent.portfolio.ENERGY || 0) * prices.ENERGY +
      (agent.portfolio.DATA || 0) * prices.DATA;
    return agent.cash + assets;
  };

  // Effect: Fetch data every 2 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        // "Cache Busting": We add ?t=timestamp to the URL.
        // This tricks the browser into thinking it's a new request every time,
        // so it forces a real reload instead of using old cached data.
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/dashboard?t=${timestamp}`, { 
            cache: 'no-store' 
        });
        
        const json = await res.json();
        
        // Log to console so you can see it working in the browser inspector
        console.log("Tick:", json.market.tick, "Prices:", json.market.prices);
        
        setData(json);
      } catch (err) {
        console.error("Failed to fetch dashboard", err);
      }
    };

    fetchData(); // Run immediately on load
    const interval = setInterval(fetchData, 2000); // Run every 2 seconds

    // Cleanup when leaving the page
    return () => clearInterval(interval);
  }, []);

  // Loading Screen
  if (!data) {
    return (
        <div className="flex h-screen items-center justify-center bg-black text-white font-mono">
            <p className="animate-pulse">Connecting to Market Uplink...</p>
        </div>
    );
  }

  const { market, agents } = data;

  // Sort agents by Net Worth (Richest on top)
  const sortedAgents = [...agents].sort((a, b) => 
    getNetWorth(b, market.prices) - getNetWorth(a, market.prices)
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-mono">
      {/* HEADER */}
      <header className="mb-8 border-b border-slate-700 pb-4 flex justify-between items-end">
        <div>
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">MARKET OF MINDS</h1>
            <p className="text-slate-400">Live Agent Trading Simulation</p>
        </div>
        <div className="text-right text-xs text-slate-500">
            <div>Status: LIVE</div>
            <div>Tick: {market.tick}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: MARKET STATUS */}
        <section className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">Global Market</h2>
          
          {/* NEWS TICKER */}
          <div className="bg-black p-4 rounded mb-6 border-l-4 border-yellow-500">
            <span className="text-yellow-500 font-bold text-sm block mb-1">LATEST NEWS</span>
            <p className="text-lg leading-snug">{market.news}</p>
          </div>

          {/* PRICES */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <PriceCard label="COMPUTE" price={market.prices.COMPUTE} />
            <PriceCard label="ENERGY" price={market.prices.ENERGY} />
            <PriceCard label="DATA" price={market.prices.DATA} />
          </div>

          <div className="mt-6 text-xs text-slate-500 text-center">
            Prices update every ~10-15 seconds based on news sentiment.
          </div>
        </section>

        {/* RIGHT COLUMN: LEADERBOARD */}
        <section className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold mb-4 text-purple-400 flex justify-between">
            <span>Leaderboard</span>
            <span className="text-sm text-slate-500 font-normal self-end">{agents.length} Agents Online</span>
          </h2>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {sortedAgents.length === 0 ? (
              <p className="text-slate-500 italic">Waiting for agents to register...</p>
            ) : (
              sortedAgents.map((agent, index) => (
                <div key={agent._id} className="flex justify-between items-center bg-slate-700 p-3 rounded hover:bg-slate-650 transition">
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        #{index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white">{agent.name}</div>
                      <div className="text-xs text-slate-400 mt-1 flex gap-2">
                        <span className="bg-slate-800 px-1 rounded">C: {agent.portfolio.COMPUTE}</span>
                        <span className="bg-slate-800 px-1 rounded">E: {agent.portfolio.ENERGY}</span>
                        <span className="bg-slate-800 px-1 rounded">D: {agent.portfolio.DATA}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-xl">
                      ${getNetWorth(agent, market.prices).toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Net Worth</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper Component for the Price Boxes
function PriceCard({ label, price }: { label: string; price: number }) {
    // Simple color logic: Green if high, Red if low (simplified for visual pop)
    const colorClass = price > 100 ? "text-green-400" : price < 50 ? "text-red-400" : "text-white";

    return (
    <div className="bg-slate-700 p-4 rounded hover:bg-slate-600 transition border-b-2 border-slate-500">
      <div className="text-slate-400 text-xs font-bold mb-1 tracking-widest">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>${price.toFixed(2)}</div>
    </div>
  );
}