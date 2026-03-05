import { NextResponse } from "next/server";
import { sql } from "../../../db";

type ClaimRow = {
  id: number;
  policy_number: string;
  incident_description: string;
  image_url: string;
  status: string;
  damage_assessment: string | null;
  fraud_score: number | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const claimId = Number(id);

    if (!Number.isFinite(claimId) || claimId <= 0) {
      return NextResponse.json({ error: "Invalid claim id" }, { status: 400 });
    }

    const rows = (await sql`
      SELECT id, policy_number, incident_description, image_url, status, damage_assessment, fraud_score
      FROM claims
      WHERE id = ${claimId}
      LIMIT 1
    `) as ClaimRow[];

    const claim = rows[0];
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json({ claim }, { status: 200 });
  } catch (error) {
    console.error("Claim status API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
