import axios from 'axios';

export const getBidHistory = async () => {

    // Get init transaction
    const initRes = await axios.get('https://api-testnet.nearblocks.io/v1/account/auction-example.testnet/txns', {
      params: {
          method: 'init',
          page: 1,
          per_page: 25,
          order: 'desc'
      },
      headers: {
          'Accept': '*/*'
      }
    });

    // Get all bid transactions
    let bidRes = await axios.get('https://api-testnet.nearblocks.io/v1/account/auction-example.testnet/txns', {
      params: {
          method: 'ft_on_transfer',
          page: 1,
          per_page: 25,
          order: 'desc'
      },
      headers: {
          'Accept': '*/*'
      }
    });
  
    // Get the starting price from the init transaction
    const initArgs = initRes.data.txns[0].actions[1].args;
    const parsedInitArgs = JSON.parse(initArgs);
    const startingPrice = Number(parsedInitArgs.starting_price);

    const txns = bidRes.data.txns;
    let pastBids = [];

    // Add bids that are higher than the previous to the pastBids array
    for (let i = txns.length - 1; i >= 0; i--) {
        const txn = txns[i];

        let args = txn.actions[0].args;
        let parsedArgs = JSON.parse(args);
        let amount = Number(parsedArgs.amount);
        let account = parsedArgs.sender_id;

        if (pastBids.length < 5) {
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
    }

    return pastBids.reverse();
  };
