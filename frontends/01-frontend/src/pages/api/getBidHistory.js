export default async function handler(req, res) {
    try {
      if (!process.env.API_KEY) {
        return res.status(500).json({ error: "API key not provided" });
      }
      // Get all bid transactions
      const { contractId } = req.query;
      const bidsRes = await fetch(`https://api-testnet.nearblocks.io/v1/account/${contractId}/txns?method=bid&page=1&per_page=25&order=desc`, {
        headers: {
          'Accept': '*/*',
          'Authorization': `Bearer ${process.env.API_KEY}`
        }
      });
      
      const bidsJson = await bidsRes.json();
  
      const txns = bidsJson.txns;
      let pastBids = [];
  
      // Loop through all bids and add valid bids to the pastBids array until 5 are found 
      for (let i = 0; i < txns.length; i++) {
        const txn = txns[i];
  
        if (txn.receipt_outcome.status) {
          let amount = txn.actions[0].deposit;
          let account = txn.predecessor_account_id

          if (pastBids.length < 5) {
            pastBids.push([account, amount]);
          } else {
            break;
          }
        }
      }
  
      // Respond with the past bids
      return res.status(200).json({ pastBids });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch past bids" });
    }
  }
  