import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(); // uses the default DB from your URI
    const collections = await db.collections();

    return NextResponse.json({
      ok: true,
      message: "Connected to MongoDB!",
      collections: collections.map((c) => c.collectionName),
    });
  } catch (error: any) {
    console.error("MongoDB connection error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
