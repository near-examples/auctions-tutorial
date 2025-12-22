from near_sdk_py import Contract, view, call, init, Promise


class AuctionContract(Contract):
    """
    A basic auction contract that allows users to place bids.
    """
    
    @init
    def init(self, end_time: int, auctioneer: str):
        """
        Initialize the auction with an end time and auctioneer.
        """
        self.storage["highest_bidder"] = self.current_account_id
        self.storage["highest_bid"] = 1
        self.storage["auction_end_time"] = end_time
        self.storage["auctioneer"] = auctioneer
        self.storage["claimed"] = False
    
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
        Claim the auction proceeds after the auction has ended.
        """
        assert self.block_timestamp > self.storage["auction_end_time"], "Auction has not ended yet"
        assert not self.storage["claimed"], "Auction has already been claimed"
        
        self.storage["claimed"] = True
        
        # Transfer tokens to the auctioneer
        auctioneer = self.storage["auctioneer"]
        highest_bid = self.storage["highest_bid"]
        return Promise.create_batch(auctioneer).transfer(highest_bid)
    
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
    def get_auctioneer(self):
        """
        Get the auctioneer account.
        """
        return self.storage.get("auctioneer", "")
    
    @view
    def get_claimed(self):
        """
        Check if the auction has been claimed.
        """
        return self.storage.get("claimed", False)
        