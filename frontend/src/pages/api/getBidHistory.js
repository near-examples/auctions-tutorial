export default async function handler(req, res) {
    try {
      if (!process.env.API_KEY) {
        return res.status(500).json({ error: "API key not provided" });
      }
      // Get all bid transactions
      const { contractId, ftId } = req.query;
      const bidsRes = await fetch(`https://api-testnet.nearblocks.io/v1/account/${contractId}/txns?from=${ftId}&method=ft_on_transfer&page=1&per_page=25&order=desc`, {
        headers: {
          'Accept': '*/*',
          'Authorization': `Bearer ${process.env.API_KEY}` // Use your API key here
        }
      });
      
      const bidsJson = await bidsRes.json();
  
      const txns = bidsJson.txns;
      let pastBids = [];
  
      // Loop through all bids and add valid bids to the pastBids array until 5 are found 
      for (let i = 0; i < txns.length; i++) {
        const txn = txns[i];
  
        if (txn.receipt_outcome.status) {
          let args = txn.actions[0].args;
          let parsedArgs = JSON.parse(args);
          let amount = Number(parsedArgs.amount);
          let account = parsedArgs.sender_id;
  
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
  