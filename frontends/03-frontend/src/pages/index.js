import { parseUnits, formatUnits } from '@/utils/amounts.mjs';
import styles from '@/styles/app.module.css';
import AuctionItem from '@/components/AuctionItem';
import Timer from '@/components/Timer';
import Bid from '@/components/Bid';
import { useContext, useEffect, useState } from 'react';
import SkeletonAuctionItem from '@/components/Skeletons/SkeletonAuctionItem';
import SkeletonTimer from '@/components/Skeletons/SkeletonTimer';
import SkeletonBid from '@/components/Skeletons/SkeletonBid';
import { NearContext } from '@/context';
import { AUCTION_CONTRACT } from '@/config';
import LastBid from '@/components/LastBid';

export default function Home() {
  const [error, setError] = useState('');
  const [auctionInfo, setAuctionInfo] = useState(null)
  const [nftInfo, setNftInfo] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(20)
  const [ftContract, setFtContract] = useState("")
  const [ftName, setFtName] = useState("")
  const [ftImg, setFtImg] = useState("")
  const [ftDecimals, setFtDecimals] = useState(0)
  const [lastBidDisplay, setLastBidDisplay] = useState('0')
  const [validAuction, setValidAuction] = useState("Invalid Auction")
  const [pastBids, setPastBids] = useState(null)

  const { wallet } = useContext(NearContext);

  useEffect(() => {
    const getInfo = async () => {
      const data = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_auction_info",
      });
      setAuctionInfo(data)
    }
    getInfo().catch((err) => setError(err.message));

    if (ftContract) {
      fetchPastBids();
    }

    const intervalId = setInterval(() => {
      getInfo().catch((err) => setError(err.message));
      setSecondsRemaining(20);
    }, 20000);
    
    const countdownIntervalId = setInterval(() => {
      setSecondsRemaining(prev => (prev === 1 ? 20 : prev - 1));
    }, 1000);

  
    return () => {
      clearInterval(intervalId);
      clearInterval(countdownIntervalId);
    };
  }, []);

  useEffect(() => {
    const getNftInfo = async () => {
      const data = await wallet.viewMethod({
        contractId: auctionInfo.nft_contract,
        method: "nft_token",
        args: { token_id: auctionInfo.token_id }
      });
      setNftInfo(data)
      setValidAuction(data?.owner_id === AUCTION_CONTRACT ? "Valid Auction" : "NFT is not held by the auction")
    }
    if (auctionInfo) {
      getNftInfo().catch((err) => setError(err.message));
    }

  }, [auctionInfo]);

  useEffect(() => {
    const getFtInfo = async () => {
      const ftInfo = await wallet.viewMethod({
        contractId: auctionInfo.ft_contract,
        method: "ft_metadata",
      });
      setFtContract(auctionInfo.ft_contract)
      setFtName(ftInfo.symbol)
      setFtImg(ftInfo.icon)
      setFtDecimals(ftInfo.decimals)
      let bidAmount = formatUnits(auctionInfo.highest_bid.bid, ftInfo.decimals)
      setLastBidDisplay(bidAmount)

      fetchPastBids(auctionInfo.ft_contract);
    }
    if (auctionInfo) {
      getFtInfo().catch((err) => setError(err.message));
    }
  }, [auctionInfo]);

  const bid = async (amount) => {
    const real_amount = parseUnits(amount, ftDecimals)
    let response = await wallet.callMethod({
      contractId: auctionInfo.ft_contract,
      method: "ft_transfer_call",
      deposit: '1',
      args: { "receiver_id": AUCTION_CONTRACT, "amount": String(real_amount), "msg": "" },
      gas:"300000000000000"
    })
    if (BigInt(response ?? '0') === 0n) {
      throw new Error('The auction rejected this bid and refunded the tokens');
    }
    window.location.reload();
    return response
  }

  const claim = async () => {
    let response = await wallet.callMethod({
      contractId: AUCTION_CONTRACT,
      method: "claim",
      gas:"300000000000000"
    })
    window.location.reload();
    return response
  }

  const fetchPastBids = async (tokenContract = ftContract) => {
    try {
      const response = await fetch(`/api/getBidHistory?contractId=${AUCTION_CONTRACT}&ftId=${tokenContract}`);
      const data = await response.json();
      setPastBids(data.error || data.pastBids);
    } catch {
      setPastBids('Bid history is unavailable');
    }
  };

  if (error) return <main role="alert">Unable to load auction: {error}</main>;

  return (
    <main className={styles.main}>
      <div className={styles.leftPanel}>
        {!auctionInfo ? <SkeletonAuctionItem /> : <LastBid lastBid={auctionInfo?.highest_bid} lastUpdate={secondsRemaining} ftName={ftName} ftImg={ftImg} lastBidDisplay={lastBidDisplay}/>} 
        {!auctionInfo ? <SkeletonAuctionItem /> : <AuctionItem nftMetadata={nftInfo?.metadata} validAuction={validAuction}/>}
      </div>
      <div className={styles.rightPanel}>
        {!auctionInfo ? <SkeletonTimer /> : <Timer endTime={auctionInfo.auction_end_time} claimed={auctionInfo?.claimed} action={claim}/>}
        {!auctionInfo ? <SkeletonBid /> : <Bid pastBids={pastBids} ftName={ftName} ftImg={ftImg} lastBidDisplay={lastBidDisplay} ftDecimals={ftDecimals} action={bid}/>}
      </div>
    </main>

  );
}