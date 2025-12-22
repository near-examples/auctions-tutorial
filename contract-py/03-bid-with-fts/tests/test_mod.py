from near_pytest.testing import NearTestCase
import json
import time


class TestAuctionContract(NearTestCase):
    @classmethod
    def setup_class(cls):
        """Compile and deploy the auction contract with FT support."""
        super().setup_class()
        
        # Compile the auction contract
        wasm_path = cls.compile_contract(
            "contract.py",
            single_file=True
        )
        
        # Deploy FT contract
        cls.ft_account = cls.create_account("ft")
        cls.ft_instance = cls.deploy_contract(
            cls.ft_account, 
            "tests/fungible_token.wasm"
        )
        
        # Initialize FT contract with total supply
        cls.ft_instance.call_as(
            account=cls.ft_account,
            method_name="new_default_meta",
            args={
                "owner_id": cls.ft_account.account_id,
                "total_supply": "1000000"
            }
        )
        
        # Deploy NFT contract
        cls.nft_account = cls.create_account("nft")
        cls.nft_instance = cls.deploy_contract(
            cls.nft_account,
            "tests/non_fungible_token.wasm"
        )
        
        # Initialize NFT contract
        cls.nft_instance.call_as(
            account=cls.nft_account,
            method_name="new_default_meta",
            args={"owner_id": cls.nft_account.account_id}
        )
        
        # Deploy auction contract
        cls.contract_account = cls.create_account("contract")
        cls.instance = cls.deploy_contract(cls.contract_account, wasm_path)
        
        # Mint NFT to contract account
        cls.nft_instance.call_as(
            account=cls.contract_account,
            method_name="nft_mint",
            args={
                "token_id": "1",
                "receiver_id": cls.contract_account.account_id,
                "token_metadata": {
                    "title": "Test NFT",
                    "description": "Test NFT for auction",
                    "media": "https://example.com/nft.png"
                }
            },
            amount=8000000000000000000000
        )
        
        # Create test users
        cls.alice = cls.create_account("alice")
        cls.bob = cls.create_account("bob")
        cls.auctioneer = cls.create_account("auctioneer")
        
        # Register accounts with FT contract
        for account in [cls.alice, cls.bob, cls.contract_account, cls.auctioneer]:
            cls.ft_instance.call_as(
                account=account,
                method_name="storage_deposit",
                args={"account_id": account.account_id},
                amount=8000000000000000000000
            )
        
        # Transfer FTs to Alice and Bob
        cls.ft_instance.call_as(
            account=cls.ft_account,
            method_name="ft_transfer",
            args={
                "receiver_id": cls.alice.account_id,
                "amount": "150000"
            },
            amount=1
        )
        
        cls.ft_instance.call_as(
            account=cls.ft_account,
            method_name="ft_transfer",
            args={
                "receiver_id": cls.bob.account_id,
                "amount": "150000"
            },
            amount=1
        )
        
        # Initialize auction contract (2 minutes from now)
        end_time = (int(time.time()) + 120) * 1_000_000_000
        cls.instance.call_as(
            account=cls.contract_account,
            method_name="init",
            args={
                "end_time": end_time,
                "auctioneer": cls.auctioneer.account_id,
                "ft_contract": cls.ft_account.account_id,
                "nft_contract": cls.nft_account.account_id,
                "token_id": "1",
                "starting_price": 10000
            }
        )
        
        # Save state for future resets
        cls.save_state()
    
    def setup_method(self):
        """Reset state before each test method."""
        self.reset_state()
        
    def test_auction_initialization(self):
        """Test that auction initializes correctly."""
        result = self.instance.call_as(
            account=self.alice,
            method_name="get_auction_info"
        )
        info = json.loads(result.text)
        
        assert info["ft_contract"] == self.ft_account.account_id
        assert info["nft_contract"] == self.nft_account.account_id
        assert info["token_id"] == "1"
        assert info["auctioneer"] == self.auctioneer.account_id
        assert info["claimed"] == False
        assert int(info["highest_bid"]["bid"]) == 10000
        
    def test_valid_bid(self):
        """Test making a valid bid with FTs."""
        # Alice makes a bid with 50000 FTs
        self.ft_instance.call_as(
            account=self.alice,
            method_name="ft_transfer_call",
            args={
                "receiver_id": self.contract_account.account_id,
                "amount": "50000",
                "msg": ""
            },
            amount=1
        )
        
        # Check highest bid
        result = self.instance.call_as(
            account=self.alice,
            method_name="get_highest_bid"
        )
        bid = json.loads(result.text)
        
        assert bid["bidder"] == self.alice.account_id
        assert int(bid["bid"]) == 50000
        
    def test_bid_too_low(self):
        """Test that low bids are rejected."""
        # Alice makes a valid bid first
        self.ft_instance.call_as(
            account=self.alice,
            method_name="ft_transfer_call",
            args={
                "receiver_id": self.contract_account.account_id,
                "amount": "50000",
                "msg": ""
            },
            amount=1
        )
        
        # Bob tries to make a lower bid (should fail)
        self.ft_instance.call_as(
            account=self.bob,
            method_name="ft_transfer_call",
            args={
                "receiver_id": self.contract_account.account_id,
                "amount": "40000",
                "msg": ""
            },
            amount=1
        )
        
        # Highest bid should still be Alice's
        result = self.instance.call_as(
            account=self.alice,
            method_name="get_highest_bid"
        )
        bid = json.loads(result.text)
        
        assert bid["bidder"] == self.alice.account_id
        assert int(bid["bid"]) == 50000
        
