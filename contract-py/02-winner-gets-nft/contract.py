from near_sdk_py import Contract, view, call, init, Promise
import json


class AuctionContract(Contract):
    
    @init
    def init(self, end_time: int, auctioneer: str, nft_contract: str, token_id: str):
        """
        Initialize the auction with an end time, auctioneer, NFT contract and token ID.
        """
        self.storage["highest_bidder"] = self.current_account_id
        self.storage["highest_bid"] = 1
        self.storage["auction_end_time"] = end_time
        self.storage["auctioneer"] = auctioneer
        self.storage["claimed"] = False
        self.storage["nft_contract"] = nft_contract
        self.storage["token_id"] = token_id
    
    @call
    def bid(self):
        """
        Place a bid in the auction. Must be higher than the current highest bid.
        """
        # Assert the auction is still ongoing
        assert self.block_timestamp < self.storage["auction_end_time"], "Auction has ended"
        
        # Current bid
        bid = self.attached_deposit
        bidder = self.predecessor_account_id
        
        # Last bid
        last_bidder = self.storage["highest_bidder"]
        last_bid = self.storage["highest_bid"]
        
        # Check if the deposit is higher than the current bid
        assert bid > last_bid, "You must place a higher bid"
        
        # Update the highest bid
        self.storage["highest_bidder"] = bidder
        self.storage["highest_bid"] = bid
        
        # Transfer tokens back to the last bidder
        return Promise.create_batch(last_bidder).transfer(last_bid)
    
    @call
    def claim(self):
        """
        Claim the auction and transfer NFT to winner and proceeds to auctioneer.
        """
        assert self.block_timestamp > self.storage.get("auction_end_time", 0), "Auction has not ended yet"
        assert not self.storage.get("claimed", False), "Auction has already been claimed"
        
        self.storage["claimed"] = True
        
        # Get auction details - read values directly as they were stored
        nft_contract = self.storage["nft_contract"]
        token_id = self.storage["token_id"]
        highest_bidder = self.storage["highest_bidder"]
        auctioneer = self.storage["auctioneer"]
        highest_bid = self.storage["highest_bid"]
        
        # Transfer tokens to the auctioneer
        Promise.create_batch(auctioneer).transfer(highest_bid)
        
        # Transfer the NFT to the highest bidder
        return Promise.create_batch(nft_contract).function_call(
            "nft_transfer",
            json.dumps({
                "receiver_id": highest_bidder,
                "token_id": token_id
            }),
            1,
            30_000_000_000_000
        )
    
    @view
    def get_highest_bid(self):
        """
        Get the current highest bid.
        """
        return {
            "bidder": self.storage.get("highest_bidder", self.current_account_id),
            "bid": self.storage.get("highest_bid", 1)
        }
    
    @view
    def get_auction_end_time(self):
        """
        Get the auction end time.
        """
        return self.storage.get("auction_end_time", 0)
    
    @view
    def get_auction_info(self):
        """
        Get all auction information.
        """
        return {
            "highest_bid": {
                "bidder": self.storage.get("highest_bidder", self.current_account_id),
                "bid": self.storage.get("highest_bid", 1)
            },
            "auction_end_time": self.storage.get("auction_end_time", 0),
            "auctioneer": self.storage.get("auctioneer", ""),
            "claimed": self.storage.get("claimed", False),
            "nft_contract": self.storage.get("nft_contract", ""),
            "token_id": self.storage.get("token_id", "")
        }
        