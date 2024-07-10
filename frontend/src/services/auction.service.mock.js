export const getInfo =  async() => {
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    let mockData = {
      end_time: String((Date.now() + 5000) * 10 ** 6),
      auctioneer: "maguila.testnet",
      ft_contract: "ftcontract.testnet",
      nft_contract: "nft_contract.testnet",
      token_id: "1",
      claimed: false,
      highest_bid:{
        bidder: "alice.testnet",
        bid: 1000
      }
    };

    return mockData;
};