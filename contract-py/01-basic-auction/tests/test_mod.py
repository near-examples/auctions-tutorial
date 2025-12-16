from near_pytest.testing import NearTestCase
import json
import time


class TestAuctionContract(NearTestCase):
    @classmethod
    def setup_class(cls):
        """Compile and deploy the auction contract."""
        super().setup_class()
        
        # Compile the contract
        wasm_path = cls.compile_contract(
            "contract.py",
            single_file=True
        )
        
        # Deploy the contract
        cls.contract_account = cls.create_account("contract", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.instance = cls.deploy_contract(cls.contract_account, wasm_path)
        
        # Create test users
        cls.alice = cls.create_account("alice", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.bob = cls.create_account("bob", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.auctioneer = cls.create_account("auctioneer", initial_balance=10_000_000_000_000_000_000_000_000)
        
        # Initialize the contract with auction ending in 60 seconds
        end_time = (int(time.time()) + 60) * 1_000_000_000
        cls.instance.call_as(
            account=cls.contract_account,
            method_name="init",
            args={"end_time": end_time, "auctioneer": cls.auctioneer.account_id},
        )
        
        # Save state for future resets
        cls.save_state()
    
    def setup_method(self):
        """Reset state before each test method."""
        self.reset_state()
    
    def test_initialization(self):
        """Test that the contract initializes correctly."""
        # Check auction end time is set
        end_time = self.instance.call_as(
            account=self.alice,
            method_name="get_auction_end_time"
        )
        assert int(end_time.text) > 0
        
        # Check auctioneer is set
        auctioneer = self.instance.call_as(
            account=self.alice,
            method_name="get_auctioneer"
        )
        assert auctioneer.text == self.auctioneer.account_id
        
        # Check claimed is false
        claimed = self.instance.call_as(
            account=self.alice,
            method_name="get_claimed"
        )
        assert claimed.text == "false"
        
        # Check initial highest bid
        highest_bid = self.instance.call_as(
            account=self.alice,
            method_name="get_highest_bid"
        )
        bid_data = json.loads(highest_bid.text)
        assert bid_data["bidder"] == self.contract_account.account_id
        assert bid_data["bid"] == 1
    
    def test_first_bid(self):
        """Test that Alice can make the first bid."""
        # Alice makes first bid of 1 NEAR
        # If this doesn't throw an exception, it succeeded
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=1_000_000_000_000_000_000_000_000  # 1 NEAR in yoctoNEAR
        )
        
        # Check highest bid is updated
        highest_bid = self.instance.call_as(
            account=self.alice,
            method_name="get_highest_bid"
        )
        bid_data = json.loads(highest_bid.text)
        assert bid_data["bidder"] == self.alice.account_id
        assert bid_data["bid"] == 1_000_000_000_000_000_000_000_000
    
    def test_higher_bid_refunds_previous(self):
        """Test that a higher bid refunds the previous bidder."""
        # Alice makes first bid of 1 NEAR
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=1_000_000_000_000_000_000_000_000
        )
        
        # Get Alice's balance after first bid
        alice_account_before = self.alice.client.view_account(self.alice.account_id)
        alice_balance_before = int(alice_account_before['amount'])
        
        # Bob makes higher bid of 2 NEAR
        self.instance.call_as(
            account=self.bob,
            method_name="bid",
            amount=2_000_000_000_000_000_000_000_000  # 2 NEAR
        )
        
        # Check Bob is now highest bidder
        highest_bid = self.instance.call_as(
            account=self.bob,
            method_name="get_highest_bid"
        )
        bid_data = json.loads(highest_bid.text)
        assert bid_data["bidder"] == self.bob.account_id
        assert bid_data["bid"] == 2_000_000_000_000_000_000_000_000
        
        # Check Alice was refunded (balance should increase by ~1 NEAR minus gas)
        alice_account_after = self.alice.client.view_account(self.alice.account_id)
        alice_balance_after = int(alice_account_after['amount'])
        assert alice_balance_after >= alice_balance_before + 990_000_000_000_000_000_000_000  # ~1 NEAR minus gas
    
    def test_lower_bid_fails(self):
        """Test that a lower bid than the current highest fails."""
        # Alice makes first bid of 2 NEAR
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=2_000_000_000_000_000_000_000_000
        )
        
        # Bob tries to make a lower bid of 1 NEAR
        try:
            self.instance.call_as(
                account=self.bob,
                method_name="bid",
                amount=1_000_000_000_000_000_000_000_000
            )
            # If we get here, the transaction didn't fail as expected
            assert False, "Expected bid to fail but it succeeded"
        except Exception as e:
            # Expected to fail
            assert "You must place a higher bid" in str(e)
    
    def test_claim_before_end_fails(self):
        """Test that claiming before auction ends fails."""
        # Alice makes a bid
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=1_000_000_000_000_000_000_000_000
        )
        
        # Auctioneer tries to claim before end time
        try:
            self.instance.call_as(
                account=self.auctioneer,
                method_name="claim"
            )
            # If we get here, the transaction didn't fail as expected
            assert False, "Expected claim to fail but it succeeded"
        except Exception as e:
            # Expected to fail
            assert "Auction has not ended yet" in str(e)
    
    def test_multiple_bids_with_refunds(self):
        """Test the complete bidding flow with refunds."""
        # Alice makes first bid of 1 NEAR
        self.instance.call_as(
            account=self.alice,
            method_name="bid",
            amount=1_000_000_000_000_000_000_000_000
        )
        
        # Get Alice's balance after first bid
        alice_account_after_bid = self.alice.client.view_account(self.alice.account_id)
        alice_balance_after_bid = int(alice_account_after_bid['amount'])
        
        # Bob makes higher bid of 2 NEAR
        self.instance.call_as(
            account=self.bob,
            method_name="bid",
            amount=2_000_000_000_000_000_000_000_000
        )
        
        # Check Alice was refunded
        alice_account_after_refund = self.alice.client.view_account(self.alice.account_id)
        alice_balance_after_refund = int(alice_account_after_refund['amount'])
        assert alice_balance_after_refund > alice_balance_after_bid


class TestAuctionContractAfterEnd(NearTestCase):
    """Tests for auction contract after auction has ended."""
    
    @classmethod
    def setup_class(cls):
        """Compile and deploy the auction contract with end time in the past."""
        super().setup_class()
        
        # Compile the contract
        wasm_path = cls.compile_contract(
            "contract.py",
            single_file=True
        )
        
        # Deploy the contract
        cls.contract_account = cls.create_account("contract", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.instance = cls.deploy_contract(cls.contract_account, wasm_path)
        
        # Create test users
        cls.alice = cls.create_account("alice", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.bob = cls.create_account("bob", initial_balance=10_000_000_000_000_000_000_000_000)
        cls.auctioneer = cls.create_account("auctioneer", initial_balance=10_000_000_000_000_000_000_000_000)
        
        # Initialize the contract with auction that already ended (1 second in the past)
        end_time = (int(time.time()) - 1) * 1_000_000_000
        cls.instance.call_as(
            account=cls.contract_account,
            method_name="init",
            args={"end_time": end_time, "auctioneer": cls.auctioneer.account_id},
        )
        
        # Save state for future resets
        cls.save_state()
    
    def setup_method(self):
        """Reset state before each test method."""
        self.reset_state()
    
    def test_bid_after_end_fails(self):
        """Test that bidding after auction ends fails."""
        # Alice tries to bid after auction ended
        try:
            self.instance.call_as(
                account=self.alice,
                method_name="bid",
                amount=1_000_000_000_000_000_000_000_000
            )
            assert False, "Expected bid to fail but it succeeded"
        except Exception as e:
            # Expected to fail - ContractCallError should contain the error message
            assert "Auction has ended" in str(e)
        
