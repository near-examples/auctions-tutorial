import { parseUnits, formatUnits } from '@/utils/amounts.mjs';
import styles from '@/styles/app.module.css';
import Timer from '@/components/Timer';
import Bid from '@/components/Bid';
import { useContext, useEffect, useState } from 'react';
import SkeletonTimer from '@/components/Skeletons/SkeletonTimer';
import SkeletonBid from '@/components/Skeletons/SkeletonBid';
import { NearContext } from '@/context';
import { AUCTION_CONTRACT } from '@/config';
import LastBid from '@/components/LastBid';

export default function Home() {
  const [error, setError] = useState('');
  const [highestBid, setHighestBid] = useState(null)
  const [highestBidder, setHighestBidder] = useState(null)
  const [claimed, setClaimed] = useState(false)
  const [auctionEndTime, setAuctionEndTime] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(20)
  const [pastBids, setPastBids] = useState(null)


  const { wallet } = useContext(NearContext);

  useEffect(() => {
    const getInfo = async () => {
      const highestBidData = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_highest_bid",
      });
      setHighestBid(formatUnits(highestBidData.bid, 24))
      setHighestBidder(highestBidData.bidder)

      const claimedData = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_claimed",
      });
      setClaimed(claimedData)

      const auctionEndTimeData = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_auction_end_time",
      });
      setAuctionEndTime(auctionEndTimeData)
    }
    getInfo().catch((err) => setError(err.message));

    fetchPastBids();

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

  const bid = async (amount) => {
    const real_amount = parseUnits(amount, 24)
    let response = await wallet.callMethod({
      contractId: AUCTION_CONTRACT,
      method: "bid",
      deposit: real_amount,
      args: {},
      gas:"300000000000000"
    })
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

  const fetchPastBids = async () => {
    try {
      const response = await fetch(`/api/getBidHistory?contractId=${AUCTION_CONTRACT}`);
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
      {!highestBid ? <SkeletonBid /> : <Bid pastBids={pastBids} lastBid={highestBid} action={bid}/>}
      </div>
      <div className={styles.rightPanel}>
        {!auctionEndTime ? <SkeletonTimer /> : <Timer endTime={auctionEndTime} claimed={claimed} action={claim}/>}
        {!highestBidder ? <SkeletonBid /> : <LastBid lastBid={highestBid} highestBidder={highestBidder} lastUpdate={secondsRemaining}/>} 
      </div>
    </main>

  );
}