import { useEffect, useState } from 'react';
import styles from '@/styles/app.module.css';

import AuctionItem from '@/components/AuctionItem';
import Timer from '@/components/Timer';
import Bid from '@/components/Bid';
import LastBid from '@/components/LastBid';

import SkeletonAuctionItem from '@/components/Skeletons/SkeletonAuctionItem';
import SkeletonTimer from '@/components/Skeletons/SkeletonTimer';
import SkeletonBid from '@/components/Skeletons/SkeletonBid';

import { useNear } from '@/hooks/useNear';
import { AUCTION_CONTRACT } from '@/config';

// Interfaces
interface BidInfo {
  bidder: string;
  bid: number;
}

interface AuctionInfo {
  highest_bid: { bidder: string; bid: number };
  auction_end_time: number | string;
  claimed: boolean;
  ft_contract: string;
  nft_contract: string;
  token_id: string;
}

interface NftToken {
  owner_id: string;
  metadata: Record<string, any>;
}

interface FtMetadata {
  symbol: string;
  icon: string;
  decimals: number;
}

export default function Home() {
  const [auctionInfo, setAuctionInfo] = useState<AuctionInfo | null>(null);
  const [nftInfo, setNftInfo] = useState<NftToken | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [ftContract, setFtContract] = useState<string>('');
  const [ftName, setFtName] = useState<string>('');
  const [ftImg, setFtImg] = useState<string>('');
  const [ftDecimals, setFtDecimals] = useState<number>(0);
  const [lastBidDisplay, setLastBidDisplay] = useState<number>(0);
  const [validAuction, setValidAuction] = useState<string>('Invalid Auction');
  const [pastBids, setPastBids] = useState<string | [string, number][] | null>(null);

  const { wallet, viewFunction, callFunction } = useNear();

  // Fetch auction info every 20s
  useEffect(() => {
    if (!wallet) return;

    const getInfo = async () => {
      try {
        const data = (await viewFunction({
          contractId: AUCTION_CONTRACT,
          method: 'get_auction_info',
        })) as AuctionInfo;

        setAuctionInfo(data);
      } catch (err) {
        console.error('Error fetching auction info:', err);
      }
    };

    getInfo();
    const intervalId = setInterval(getInfo, 20000);

    const countdownIntervalId = setInterval(() => {
      setSecondsRemaining((prev) => (prev === 1 ? 20 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(countdownIntervalId);
    };
  }, [wallet]);

  // Fetch NFT info
  useEffect(() => {
    if (!auctionInfo) return;

    const getNftInfo = async () => {
      try {
        const data = (await viewFunction({
          contractId: auctionInfo.nft_contract,
          method: 'nft_token',
          args: { token_id: auctionInfo.token_id },
        })) as NftToken;

        setNftInfo(data);

        if (data.owner_id === AUCTION_CONTRACT) {
          setValidAuction('Valid Auction');
        }
      } catch (err) {
        console.error('Error fetching NFT info:', err);
      }
    };

    getNftInfo();
  }, [auctionInfo, viewFunction]);

  // Fetch FT info
  useEffect(() => {
    if (!auctionInfo) return;

    const getFtInfo = async () => {
      try {
        const ftInfo = (await viewFunction({
          contractId: auctionInfo.ft_contract,
          method: 'ft_metadata',
        })) as FtMetadata;

        setFtContract(auctionInfo.ft_contract);
        setFtName(ftInfo.symbol);
        setFtImg(ftInfo.icon);
        setFtDecimals(ftInfo.decimals);

        const bidAmount = auctionInfo.highest_bid.bid / 10 ** ftInfo.decimals;
        setLastBidDisplay(bidAmount);

        fetchPastBids(auctionInfo.ft_contract);
      } catch (err) {
        console.error('Error fetching FT info:', err);
      }
    };

    getFtInfo();
  }, [auctionInfo, viewFunction]);

  // Fetch past bids and convert to [string, number][]
  const fetchPastBids = async (ftId: string) => {
    try {
      const response = await fetch(`/api/getBidHistory?contractId=${AUCTION_CONTRACT}&ftId=${ftId}`);
      const data = await response.json();

      if (data.error) {
        setPastBids(data.error);
      } else {
        const converted: [string, number][] = data.pastBids.map((b: BidInfo) => [b.bidder, b.bid]);
        setPastBids(converted);
      }
    } catch (err) {
      console.error('Error fetching past bids:', err);
    }
  };

  // Place a bid
  const bid = async (amount: number) => {
    if (!auctionInfo) return;
    const realAmount = amount * 10 ** ftDecimals;

    const response = await callFunction({
      contractId: auctionInfo.ft_contract,
      method: 'ft_transfer_call',
      deposit: '1',
      args: { receiver_id: AUCTION_CONTRACT, amount: String(realAmount), msg: '' },
      gas: '300000000000000',
    });

    return response;
  };

  // Claim auction
  const claim = async () => {
    if (!auctionInfo) return;

    const response = await callFunction({
      contractId: AUCTION_CONTRACT,
      method: 'claim',
      gas: '300000000000000',
    });

    return response;
  };

  return (
    <main className={styles.main}>
      <div className={styles.leftPanel}>
        {!auctionInfo ? (
          <SkeletonAuctionItem />
        ) : (
          <LastBid
            lastBid={auctionInfo.highest_bid}
            lastUpdate={secondsRemaining}
            ftName={ftName}
            ftImg={ftImg}
            lastBidDisplay={lastBidDisplay}
          />
        )}
        {!auctionInfo ? (
          <SkeletonAuctionItem />
        ) : (
          <AuctionItem nftMetadata={nftInfo?.metadata} validAuction={validAuction} />
        )}
      </div>

      <div className={styles.rightPanel}>
        {!auctionInfo ? (
          <SkeletonTimer />
        ) : (
          <Timer endTime={Number(auctionInfo.auction_end_time)} claimed={auctionInfo.claimed} action={claim} />
        )}
        {!auctionInfo ? (
          <SkeletonBid />
        ) : (
          <Bid
            pastBids={pastBids}
            ftName={ftName}
            ftImg={ftImg}
            lastBidDisplay={lastBidDisplay}
            ftDecimals={ftDecimals}
            action={bid}
          />
        )}
      </div>
    </main>
  );
}
