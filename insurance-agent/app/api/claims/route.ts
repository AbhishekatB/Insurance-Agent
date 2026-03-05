import { BlobServiceClient } from "@azure/storage-blob";
import { NextResponse } from "next/server";
import { sql } from "../../db";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const policyNumber = formData.get("policyNumber");
    const claimDescription = formData.get("claimDescription");
    const claimFile = formData.get("claimFile");

    if (
      typeof policyNumber !== "string" ||
      !policyNumber.trim() ||
      typeof claimDescription !== "string" ||
      !claimDescription.trim() ||
      !(claimFile instanceof File)
    ) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const policy = policyNumber.trim();
    const description = claimDescription.trim();

    // Step 1: Validate policy in Neon first to avoid Azure costs on invalid policies.
    const policyRows = (await sql`
      SELECT policy_number, is_active
      FROM policies
      WHERE policy_number = ${policy}
      LIMIT 1
    `) as Array<{ policy_number: string; is_active: boolean }>;

    if (policyRows.length === 0) {
      return NextResponse.json({ error: "Invalid policy number" }, { status: 404 });
    }

    if (!policyRows[0].is_active) {
      return NextResponse.json({ error: "Policy is inactive" }, { status: 400 });
    }

    // Step 2: Upload image to Azure Blob and capture URL.
    const connectionString = getRequiredEnv("AZURE_STORAGE_CONNECTION_STRING");
    const containerName = getRequiredEnv("AZURE_STORAGE_CONTAINER_NAME");

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const fileBuffer = Buffer.from(await claimFile.arrayBuffer());
    const blobName = `${policy}/${Date.now()}-${sanitizeFileName(claimFile.name)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: {
        blobContentType: claimFile.type || "application/octet-stream",
      },
    });

    const imageUrl = blockBlobClient.url;

    // Step 3: Store claim in Neon with initial status.
    const insertedClaim = (await sql`
      INSERT INTO claims (policy_number, incident_description, image_url, status)
      VALUES (${policy}, ${description}, ${imageUrl}, ${"queued"})
      RETURNING id
    `) as Array<{ id: number }>;

    const claimId = insertedClaim[0]?.id;
    if (!claimId) {
      return NextResponse.json({ error: "Claim insertion failed" }, { status: 500 });
    }

    // Step 4: Trigger Python agent asynchronously.
    // 0.0.0.0 is for binding a server; use 127.0.0.1 for local client calls.
    const agentUrl = process.env.AGENT_WEBHOOK_URL || "http://127.0.0.1:8080/process-claim";

    void fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claimId,
        imageUrl,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          console.error("Python agent returned non-OK status:", response.status);
          await sql`
            UPDATE claims
            SET status = ${"failed"}
            WHERE id = ${claimId}
          `;
        }
      })
      .catch(async (error) => {
        console.error("Python agent trigger failed:", error);
        await sql`
          UPDATE claims
          SET status = ${"failed"}
          WHERE id = ${claimId}
        `;
      });

    return NextResponse.json(
      {
        success: true,
        message: "Claim submitted. Processing started.",
        claim_id: claimId,
        image_url: imageUrl,
        status: "queued",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Claim API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
