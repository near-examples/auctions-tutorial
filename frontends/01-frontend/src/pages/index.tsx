
import { useEffect, useState } from 'react';

import styles from '@/styles/app.module.css';

import Timer from '@/components/Timer';
import Bid from '@/components/Bid';
import SkeletonTimer from '@/components/Skeletons/SkeletonTimer';
import SkeletonBid from '@/components/Skeletons/SkeletonBid';
import LastBid from '@/components/LastBid';

import { useNear } from '@/hooks/useNear';
import { AUCTION_CONTRACT } from '@/config';

interface HighestBidData {
  bid: number;
  bidder: string;
}

export default function Home() {
  const [highestBid, setHighestBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string>('');
  const [claimed, setClaimed] = useState<boolean>(false);
  const [auctionEndTime, setAuctionEndTime] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [pastBids, setPastBids] = useState<[]>([]);
  const nearMultiplier = 1e24;

  const { signedAccountId, viewFunction, callFunction } = useNear();

  useEffect(() => {
    if (!signedAccountId) return;

    const getInfo = async () => {
      try {
        const highestBidData = (await viewFunction({
          contractId: AUCTION_CONTRACT,
          method: 'get_highest_bid',
        })) as HighestBidData | null;

        if (highestBidData) {
          setHighestBid(highestBidData.bid / nearMultiplier);
          setHighestBidder(highestBidData.bidder);
        }

        const claimedData = (await viewFunction({
          contractId: AUCTION_CONTRACT,
          method: 'get_claimed',
        })) as boolean;
        setClaimed(claimedData);

        const auctionEndTimeData = (await viewFunction({
          contractId: AUCTION_CONTRACT,
          method: 'get_auction_end_time',
        })) as number;
        setAuctionEndTime(auctionEndTimeData);
      } catch (err) {
        console.error('Error fetching auction info:', err);
      }
    };

    const fetchPastBids = async () => {
      try {
        const response = await fetch(`/api/getBidHistory?contractId=${AUCTION_CONTRACT}`);
        const data = await response.json();
        setPastBids(data?.pastBids || []);
      } catch (err) {
        console.error('Error fetching past bids:', err);
        setPastBids([]);
      }
    };

    getInfo();
    fetchPastBids();

    const intervalId = setInterval(() => {
      getInfo();
      setSecondsRemaining(20);
    }, 20000);

    const countdownIntervalId = setInterval(() => {
      setSecondsRemaining((prev) => (prev === 1 ? 20 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(countdownIntervalId);
    };
  }, [signedAccountId, viewFunction]);

  const placeBid = async (amount: number) => {
    const realAmount = amount * nearMultiplier;
    return await callFunction({
      contractId: AUCTION_CONTRACT,
      method: 'bid',
      args: {},
      deposit: realAmount.toString(),
      gas: '300000000000000',
    });
  };

  const claimAuction = async () => {
    return await callFunction({
      contractId: AUCTION_CONTRACT,
      method: 'claim',
      args: {},
      gas: '300000000000000',
    });
  };

  return (
    <main className={styles.main}>
      <div className={styles.leftPanel}>
        {!highestBid ? (
          <SkeletonBid />
        ) : (
          <Bid pastBids={pastBids} lastBid={highestBid} action={placeBid} />
        )}
      </div>

      <div className={styles.rightPanel}>
        {!auctionEndTime ? (
          <SkeletonTimer />
        ) : (
          <Timer endTime={auctionEndTime} claimed={claimed} action={claimAuction} />
        )}
        {!highestBidder ? (
          <SkeletonBid />
        ) : (
          <LastBid
            lastBid={highestBid}
            highestBidder={highestBidder}
            lastUpdate={secondsRemaining} 
          />
        )}
      </div>
    </main>
  );
}
