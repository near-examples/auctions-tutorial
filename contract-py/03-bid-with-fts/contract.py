from near_sdk_py import Contract, view, call, init, Promise
import json


class AuctionContract(Contract):
    
    @init
    def init(self, end_time: int, auctioneer: str, ft_contract: str, nft_contract: str, token_id: str, starting_price: int):
        """
        Initialize the auction with FT bidding support.
        """
        # CLI calls often pass numbers as JSON strings; normalize to ints to avoid runtime panics.
        end_time = int(end_time)
        starting_price = int(starting_price)

        self.storage["highest_bidder"] = self.current_account_id
        self.storage["highest_bid"] = starting_price
        self.storage["auction_end_time"] = end_time
        self.storage["auctioneer"] = auctioneer
        self.storage["claimed"] = False
        self.storage["ft_contract"] = ft_contract
        self.storage["nft_contract"] = nft_contract
        self.storage["token_id"] = token_id
    
    @call
    def ft_on_transfer(self, sender_id: str, amount: str, msg: str):
        """
        Callback for when FTs are transferred to this contract (NEP-141 standard).
        Users bid by transferring FT tokens to the contract.
        """
        # Convert amount from string to int for comparison
        amount_int = int(amount)
        
        # Assert the auction is still ongoing
        assert self.block_timestamp < int(self.storage["auction_end_time"]), "Auction has ended"
        
        # Check that the FT contract is the one we accept
        ft = self.predecessor_account_id
        assert ft == self.storage["ft_contract"], "The token is not supported"
        
        # Last bid
        last_bidder = self.storage["highest_bidder"]
        last_bid = int(self.storage["highest_bid"])
        
        # Check if the deposit is higher than the current bid
        assert amount_int > last_bid, "You must place a higher bid"
        
        # Update the highest bid
        self.storage["highest_bidder"] = sender_id
        self.storage["highest_bid"] = amount_int
        
        # Transfer FTs back to the last bidder
        Promise.create_batch(self.storage["ft_contract"]).function_call(
            "ft_transfer",
            json.dumps({
                "receiver_id": last_bidder,
                "amount": str(last_bid)
            }),
            1,
            30_000_000_000_000
        )
        
        # Return "0" to indicate all tokens were accepted
        return "0"
    
    @call
    def claim(self):
        """
        Claim the auction and transfer NFT to winner and FTs to auctioneer.
        """
        assert self.block_timestamp > self.storage.get("auction_end_time", 0), "Auction has not ended yet"
        assert not self.storage.get("claimed", False), "Auction has been claimed"
        
        self.storage["claimed"] = True
        
        # Get auction details
        ft_contract = self.storage["ft_contract"]
        nft_contract = self.storage["nft_contract"]
        token_id = self.storage["token_id"]
        highest_bidder = self.storage["highest_bidder"]
        auctioneer = self.storage["auctioneer"]
        highest_bid = self.storage["highest_bid"]
        
        # Transfer FTs to the auctioneer
        Promise.create_batch(ft_contract).function_call(
            "ft_transfer",
            json.dumps({
                "receiver_id": auctioneer,
                "amount": str(highest_bid)
            }),
            1,
            30_000_000_000_000
        )
        
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
            "bid": str(self.storage.get("highest_bid", 1))
        }
    
    @view
    def get_auction_end_time(self):
        """
        Get the auction end time.
        """
        return str(self.storage.get("auction_end_time", 0))
    
    @view
    def get_auction_info(self):
        """
        Get all auction information.
        """
        return {
            "highest_bid": {
                "bidder": self.storage.get("highest_bidder", self.current_account_id),
                "bid": str(self.storage.get("highest_bid", 1))
            },
            "auction_end_time": str(self.storage.get("auction_end_time", 0)),
            "auctioneer": self.storage.get("auctioneer", ""),
            "claimed": self.storage.get("claimed", False),
            "ft_contract": self.storage.get("ft_contract", ""),
            "nft_contract": self.storage.get("nft_contract", ""),
            "token_id": self.storage.get("token_id", "")
        }
        