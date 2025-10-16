import type { NextApiRequest, NextApiResponse } from "next";

interface BidResponse {
  pastBids: [string, string][];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BidResponse | ErrorResponse>
): Promise<void> {
  try {
    if (!process.env.API_KEY) {
      res.status(500).json({ error: "API key not provided" });
      return;
    }

    const { contractId } = req.query;

    if (!contractId || typeof contractId !== "string") {
      res.status(400).json({ error: "Missing or invalid contractId" });
      return;
    }

    const bidsRes = await fetch(
      `https://api-testnet.nearblocks.io/v1/account/${contractId}/txns?method=bid&page=1&per_page=25&order=desc`,
      {
        headers: {
          Accept: "*/*",
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      }
    );

    const bidsJson = await bidsRes.json();
    const txns = bidsJson.txns || [];

    const pastBids: [string, string][] = [];

    for (let i = 0; i < txns.length; i++) {
      const txn = txns[i];

      if (txn.receipt_outcome?.status && txn.actions?.[0]?.deposit) {
        const amount: string = txn.actions[0].deposit;
        const account: string = txn.predecessor_account_id;

        pastBids.push([account, amount]);

        if (pastBids.length >= 5) break;
      }
    }

    res.status(200).json({ pastBids });
  } catch (error) {
    console.error("Error fetching past bids:", error);
    res.status(500).json({ error: "Failed to fetch past bids" });
  }
}
