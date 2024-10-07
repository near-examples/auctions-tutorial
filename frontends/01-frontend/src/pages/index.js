import styles from '@/styles/app.module.css';
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
  const [highestBid, setHighestBid] = useState(null)
  const [highestBidder, setHighestBidder] = useState(null)
  const [claimed, setClaimed] = useState(false)
  const [auctionEndTime, setAuctionEndTime] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(20)
  const [pastBids, setPastBids] = useState(null)
  const nearMultiplier = Math.pow(10, 24)

  const { wallet } = useContext(NearContext);

  useEffect(() => {
    const getInfo = async () => {
      const highestBidData = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_highest_bid",
      });
      setHighestBid(highestBidData.bid / nearMultiplier)
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
    getInfo();

    fetchPastBids();

    const intervalId = setInterval(() => {
      getInfo();
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
    let real_amount = amount * nearMultiplier
    let response = await wallet.callMethod({
      contractId: AUCTION_CONTRACT,
      method: "bid",
      deposit: real_amount,
      args: {},
      gas:"300000000000000"
    })
    return response
  }

  const claim = async () => {
    let response = await wallet.callMethod({
      contractId: AUCTION_CONTRACT,
      method: "claim",
      gas:"300000000000000"
    })
    return response
  }

  const fetchPastBids = async () => {
      const response = await fetch(`/api/getBidHistory?contractId=${AUCTION_CONTRACT}&ftId=${ftContract}`);
      const data = await response.json();
      if (data.error) {
        setPastBids(data.error);
      } else {
        setPastBids(data.pastBids);
      }
  }

  return (
    <main className={styles.main}>
      <div className={styles.leftPanel}>
      {!auctionInfo ? <SkeletonBid /> : <Bid pastBids={pastBids} lastBid={highestBid} action={bid}/>}
      </div>
      <div className={styles.rightPanel}>
        {!auctionInfo ? <SkeletonTimer /> : <Timer endTime={auctionEndTime} claimed={claimed} action={claim}/>}
        {!auctionInfo ? <SkeletonAuctionItem /> : <LastBid lastBid={highestBid} highestBidder={highestBidder} lastUpdate={secondsRemaining}/>} 
      </div>
    </main>

  );
}