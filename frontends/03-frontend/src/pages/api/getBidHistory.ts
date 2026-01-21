import type { NextApiRequest, NextApiResponse } from "next";


interface Txn {
  receipt_outcome: {
    status: any;
  };
  actions: {
    args: string;
  }[];
}

interface BidsResponse {
  txns: Txn[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    if (!process.env.API_KEY) {
      res.status(500).json({ error: "API key not provided" });
      return;
    }

    const { contractId, ftId } = req.query;

    if (!contractId || !ftId || typeof contractId !== "string" || typeof ftId !== "string") {
      res.status(400).json({ error: "Missing or invalid query parameters" });
      return;
    }
    

    const bidsRes = await fetch(
      `https://api-testnet.nearblocks.io/v1/account/${contractId}/txns?from=${ftId}&method=ft_on_transfer&page=1&per_page=25&order=desc`,
      {
        headers: {
          Accept: "*/*",
          Authorization: `Bearer ${process.env.API_KEYs}`,
        },
      }
    );

    if (!bidsRes.ok) {
      throw new Error(`Failed to fetch transactions: ${bidsRes.statusText}`);
    }

    const bidsJson: BidsResponse = await bidsRes.json();
    const txns = bidsJson.txns;

    const pastBids: [string, number][] = [];

    for (let i = 0; i < txns.length; i++) {
      const txn = txns[i];

      if (txn.receipt_outcome.status) {
        try {
          const args = txn.actions[0]?.args;
          const parsedArgs = JSON.parse(args);
          const amount = Number(parsedArgs.amount);
          const account = parsedArgs.sender_id;

          if (pastBids.length < 5) {
            pastBids.push([account, amount]);
          } else {
            break;
          }
        } catch {
          // skip invalid JSON
          continue;
        }
      }
    }

    res.status(200).json({ pastBids });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch past bids" });
  }
}
