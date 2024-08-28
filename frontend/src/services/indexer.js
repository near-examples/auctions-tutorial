export const getBidHistory = async () => {
    try {
      // Get init transaction
      const initRes = await fetch('https://api-testnet.nearblocks.io/v1/account/auction-example.testnet/txns?page=1&per_page=1&order=desc&method=init', {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });

      const initJson = await initRes.json();

      // Get all bid transactions
      const bidRes = await fetch('https://api-testnet.nearblocks.io/v1/account/auction-example.testnet/txns?page=1&per_page=25&order=desc&method=ft_on_transfer', {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });
      
      const bidJson = await bidRes.json();

      // Get the starting price from the init transaction
      const initArgs = initJson.txns[0].actions[1].args;
      const parsedInitArgs = JSON.parse(initArgs);
      const startingPrice = Number(parsedInitArgs.starting_price);

      const txns = bidJson.txns;
      let pastBids = [];

      // Add bids that are higher than the previous to the pastBids array
      for (let i = txns.length - 1; i >= 0; i--) {
          const txn = txns[i];

          let args = txn.actions[0].args;
          let parsedArgs = JSON.parse(args);
          let amount = Number(parsedArgs.amount);
          let account = parsedArgs.sender_id;

            if (pastBids.length > 0) {
              const last_amount = pastBids[pastBids.length - 1][1];
              if (amount > last_amount) {
                pastBids.push([account, amount]);
              }
            } else {
              if (amount > startingPrice) {
                pastBids.push([account, amount]);
              }
            }
      }

      return pastBids.reverse().slice(0, 5);

    } catch (error) {
      console.log("Failed to fetch historical bid data", error);
    }
  };
