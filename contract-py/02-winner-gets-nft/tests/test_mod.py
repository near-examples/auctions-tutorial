from near_pytest.testing import NearTestCase
import json
import time
import os

NFT_WASM_FILEPATH = os.path.join(os.path.dirname(__file__), "non_fungible_token.wasm")
TOKEN_ID = "1"
ONE_NEAR = 1_000_000_000_000_000_000_000_000
TWO_NEAR = 2_000_000_000_000_000_000_000_000
THREE_NEAR = 3_000_000_000_000_000_000_000_000


class TestAuctionContractBeforeEnd(NearTestCase):
    @classmethod
    def setup_class(cls):
        """Compile and deploy the auction and NFT contracts."""
        super().setup_class()
        
        # Create test users
        cls.alice = cls.create_account("alice", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.bob = cls.create_account("bob", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.auctioneer = cls.create_account("auctioneer", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.contract_account = cls.create_account("contract", initial_balance=10_000_000_000_000_000_000_000_000)
        
        # Deploy and initialize NFT contract
        cls.nft_contract_account = cls.create_account("nft_contract", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.nft_contract = cls.deploy_contract(cls.nft_contract_account, NFT_WASM_FILEPATH)
        
        # Initialize NFT contract
        cls.nft_contract.call_as(
            account=cls.nft_contract_account,
            method_name="new_default_meta",
            args={"owner_id": cls.nft_contract_account.account_id}
        )
        
        # Mint NFT to the auction contract
        cls.nft_contract.call_as(
            account=cls.nft_contract_account,
            method_name="nft_mint",
            args={
                "token_id": TOKEN_ID,
                "receiver_id": cls.contract_account.account_id,
                "token_metadata": {
                    "title": "LEEROYYYMMMJENKINSSS",
                    "description": "Alright time's up, let's do this.",
                    "media": "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1"
                }
            },
            amount=80_000_000_000_000_000_000_000  # 0.08 NEAR for storage
        )
        
        # Compile and deploy the auction contract
        wasm_path = cls.compile_contract(
            "contract.py",
            single_file=True
        )
        cls.instance = cls.deploy_contract(cls.contract_account, wasm_path)
        
        # Initialize the auction contract with a future end time
        cls.end_time = int((time.time() + 60) * 1_000_000_000)  # 60 seconds from now in nanoseconds
        cls.instance.call_as(
            account=cls.contract_account,
            method_name="init",
            args={
                "end_time": cls.end_time,
                "auctioneer": cls.auctioneer.account_id,
                "nft_contract": cls.nft_contract_account.account_id,
                "token_id": TOKEN_ID
            },
        )
        
        # Save state for future resets
        cls.save_state()
    
    def setup_method(self):
        """Reset state before each test method."""
        self.reset_state()
        
    def test_contract_is_operational(self):
        """Test the full auction lifecycle from bidding to claiming."""
        # Alice makes first bid
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=ONE_NEAR
        )
        
        # Check highest bid is Alice's
        highest_bid = self.instance.call_as(
            account=self.alice,
            method_name="get_highest_bid"
        )
        bid_info = json.loads(highest_bid.text)
        assert bid_info["bidder"] == self.alice.account_id
        assert bid_info["bid"] == ONE_NEAR
        
        # Get Alice's balance before Bob bids
        alice_account_before = self.alice.client.view_account(self.alice.account_id)
        alice_balance_before = int(alice_account_before['amount'])
        
        # Bob makes a higher bid
        self.instance.call_as(
            account=self.bob,
            method_name="bid",
            amount=TWO_NEAR
        )
        
        # Check highest bid is now Bob's
        highest_bid = self.instance.call_as(
            account=self.bob,
            method_name="get_highest_bid"
        )
        bid_info = json.loads(highest_bid.text)
        assert bid_info["bidder"] == self.bob.account_id
        assert bid_info["bid"] == TWO_NEAR
        
        # Check that Alice was refunded her bid
        alice_account_after = self.alice.client.view_account(self.alice.account_id)
        alice_balance_after = int(alice_account_after['amount'])
        # Account for gas costs, Alice should have gained approximately ONE_NEAR
        assert alice_balance_after >= alice_balance_before + int(ONE_NEAR * 0.99), "Alice should have been refunded her bid"
        
        # Alice tries to make a lower bid - should fail
        try:
            self.instance.call_as(
                account=self.alice,
                method_name="bid",
                amount=ONE_NEAR
            )
            assert False, "Expected lower bid to fail"
        except Exception as e:
            assert "You must place a higher bid" in str(e) or "Smart contract panicked" in str(e)
        
        # Auctioneer tries to claim before auction ends - should fail
        try:
            self.instance.call_as(
                account=self.auctioneer,
                method_name="claim",
                gas=300_000_000_000_000
            )
            assert False, "Expected claim before end to fail"
        except Exception as e:
            assert "Auction has not ended yet" in str(e) or "Smart contract panicked" in str(e)


class TestAuctionContractAfterEnd(NearTestCase):
    """Tests for auction contract after auction has ended."""
    
    @classmethod
    def setup_class(cls):
        """Compile and deploy the auction and NFT contracts with auction that has ended."""
        super().setup_class()
        
        # Create test users
        cls.alice = cls.create_account("alice", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.auctioneer = cls.create_account("auctioneer", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.contract_account = cls.create_account("contract", initial_balance=10_000_000_000_000_000_000_000_000)
        
        # Deploy and initialize NFT contract
        cls.nft_contract_account = cls.create_account("nft_contract", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.nft_contract = cls.deploy_contract(cls.nft_contract_account, NFT_WASM_FILEPATH)
        
        # Initialize NFT contract
        cls.nft_contract.call_as(
            account=cls.nft_contract_account,
            method_name="new_default_meta",
            args={"owner_id": cls.nft_contract_account.account_id}
        )
        
        # Mint NFT to the auction contract
        cls.nft_contract.call_as(
            account=cls.nft_contract_account,
            method_name="nft_mint",
            args={
                "token_id": TOKEN_ID,
                "receiver_id": cls.contract_account.account_id,
                "token_metadata": {
                    "title": "LEEROYYYMMMJENKINSSS",
                    "description": "Alright time's up, let's do this.",
                    "media": "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1"
                }
            },
            amount=80_000_000_000_000_000_000_000  # 0.08 NEAR for storage
        )
        
        # Compile and deploy the auction contract
        wasm_path = cls.compile_contract(
            "contract.py",
            single_file=True
        )
        cls.instance = cls.deploy_contract(cls.contract_account, wasm_path)
        
        # Initialize the auction contract with end time in the past
        cls.end_time = int((time.time() - 1) * 1_000_000_000)  # 1 second ago in nanoseconds
        cls.instance.call_as(
            account=cls.contract_account,
            method_name="init",
            args={
                "end_time": cls.end_time,
                "auctioneer": cls.auctioneer.account_id,
                "nft_contract": cls.nft_contract_account.account_id,
                "token_id": TOKEN_ID
            },
        )
        
        # Save state for future resets
        cls.save_state()
    
    def setup_method(self):
        """Reset state before each test method."""
        self.reset_state()
    
    def test_bid_after_auction_ends_fails(self):
        """Test that bidding after auction ends fails."""
        try:
            self.instance.call_as(
                account=self.alice,
                method_name="bid",
                amount=THREE_NEAR
            )
            assert False, "Expected bid after auction end to fail"
        except Exception as e:
            assert "Auction has ended" in str(e) or "Smart contract panicked" in str(e)


class TestAuctionContractFullLifecycle(NearTestCase):
    """Tests for full auction lifecycle including claim and NFT transfer."""
    
    @classmethod
    def setup_class(cls):
        """Compile and deploy the auction and NFT contracts."""
        super().setup_class()
        
        # Create test users
        cls.alice = cls.create_account("alice", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.bob = cls.create_account("bob", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.auctioneer = cls.create_account("auctioneer", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.contract_account = cls.create_account("contract", initial_balance=10_000_000_000_000_000_000_000_000)
        
        # Deploy and initialize NFT contract
        cls.nft_contract_account = cls.create_account("nft_contract", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.nft_contract = cls.deploy_contract(cls.nft_contract_account, NFT_WASM_FILEPATH)
        
        # Initialize NFT contract
        cls.nft_contract.call_as(
            account=cls.nft_contract_account,
            method_name="new_default_meta",
            args={"owner_id": cls.nft_contract_account.account_id}
        )
        
        # Mint NFT to the auction contract
        cls.nft_contract.call_as(
            account=cls.nft_contract_account,
            method_name="nft_mint",
            args={
                "token_id": TOKEN_ID,
                "receiver_id": cls.contract_account.account_id,
                "token_metadata": {
                    "title": "LEEROYYYMMMJENKINSSS",
                    "description": "Alright time's up, let's do this.",
                    "media": "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1"
                }
            },
            amount=80_000_000_000_000_000_000_000  # 0.08 NEAR for storage
        )
        
        # Compile and deploy the auction contract
        wasm_path = cls.compile_contract(
            "contract.py",
            single_file=True
        )
        cls.instance = cls.deploy_contract(cls.contract_account, wasm_path)
        
        # Initialize the auction contract with a future end time
        cls.end_time = int((time.time() + 60) * 1_000_000_000)  # 60 seconds from now in nanoseconds
        cls.instance.call_as(
            account=cls.contract_account,
            method_name="init",
            args={
                "end_time": cls.end_time,
                "auctioneer": cls.auctioneer.account_id,
                "nft_contract": cls.nft_contract_account.account_id,
                "token_id": TOKEN_ID
            },
        )
        
        # Save state for future resets
        cls.save_state()
    
    def setup_method(self):
        """Reset state before each test method."""
        self.reset_state()
        
    def test_full_auction_lifecycle_with_claim(self):
        """Test the full auction lifecycle including bidding, claim, NFT transfer, and preventing double claim."""
        # Alice makes first bid
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=ONE_NEAR
        )
        
        # Bob makes a higher bid
        self.instance.call_as(
            account=self.bob,
            method_name="bid",
            amount=TWO_NEAR
        )
        
        # Check highest bid is Bob's
        highest_bid = self.instance.call_as(
            account=self.bob,
            method_name="get_highest_bid"
        )
        bid_info = json.loads(highest_bid.text)
        assert bid_info["bidder"] == self.bob.account_id
        assert bid_info["bid"] == TWO_NEAR
        
        # Get auctioneer's balance before claim
        auctioneer_account_before = self.auctioneer.client.view_account(self.auctioneer.account_id)
        auctioneer_balance_before = int(auctioneer_account_before['amount'])
        
        # Wait for auction to end (60+ seconds)
        time.sleep(61)
        
        # Auctioneer claims the auction
        self.instance.call_as(
            account=self.auctioneer,
            method_name="claim",
            gas=300_000_000_000_000
        )
        
        # Check the auctioneer has the correct balance (should have received TWO_NEAR)
        auctioneer_account_after = self.auctioneer.client.view_account(self.auctioneer.account_id)
        auctioneer_balance_after = int(auctioneer_account_after['amount'])
        
        # Account for gas costs, auctioneer should have gained approximately TWO_NEAR minus gas
        expected_min_balance = auctioneer_balance_before + int(TWO_NEAR * 0.95)
        expected_max_balance = auctioneer_balance_before + int(TWO_NEAR * 1.01)
        assert auctioneer_balance_after >= expected_min_balance, f"Auctioneer should have received approximately TWO_NEAR. Before: {auctioneer_balance_before}, After: {auctioneer_balance_after}, Difference: {auctioneer_balance_after - auctioneer_balance_before}"
        assert auctioneer_balance_after <= expected_max_balance, f"Auctioneer balance should not exceed expected max. Before: {auctioneer_balance_before}, After: {auctioneer_balance_after}"
        
        # Check highest bidder (Bob) received the NFT
        nft_token = self.nft_contract.call_as(
            account=self.bob,
            method_name="nft_token",
            args={"token_id": TOKEN_ID}
        )
        token_info = json.loads(nft_token.text)
        assert token_info["owner_id"] == self.bob.account_id, "Bob should own the NFT as the highest bidder"
        
        # Auctioneer tries to claim the auction again - should fail
        try:
            self.instance.call_as(
                account=self.auctioneer,
                method_name="claim",
                gas=300_000_000_000_000
            )
            assert False, "Expected second claim attempt to fail"
        except Exception as e:
            assert "Auction has already been claimed" in str(e) or "Smart contract panicked" in str(e), f"Expected claim error, got: {str(e)}"
