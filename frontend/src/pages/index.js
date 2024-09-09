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
  const [auctionInfo, setAuctionInfo] = useState(null)
  const [nftInfo, setNftInfo] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(20)
  const [ftContract, setFtContract] = useState("")
  const [ftName, setFtName] = useState("")
  const [ftImg, setFtImg] = useState("")
  const [ftDecimals, setFtDecimals] = useState(0)
  const [lastBidDisplay, setLastBidDisplay] = useState(0)
  const [validAuction, setValidAuction] = useState("Invalid Auction")
  const [pastBids, setPastBids] = useState([])

  const { wallet } = useContext(NearContext);

  useEffect(() => {
    const getInfo = async () => {
      const data = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_auction_info",
      });
      setAuctionInfo(data)
    }
    getInfo();

    if (ftContract) {
      fetchPastBids();
    }

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

  useEffect(() => {
    const getNftInfo = async () => {
      const data = await await wallet.viewMethod({
        contractId: auctionInfo.nft_contract,
        method: "nft_token",
        args: { token_id: auctionInfo.token_id }
      });
      setNftInfo(data)
      if (data.owner_id == AUCTION_CONTRACT) {
        setValidAuction("Valid Auction")
      }
    }
    if (auctionInfo) {
      getNftInfo();
    }

  }, [auctionInfo]);

  useEffect(() => {
    const getFtInfo = async () => {
      const ftInfo = await await wallet.viewMethod({
        contractId: auctionInfo.ft_contract,
        method: "ft_metadata",
      });
      setFtContract(auctionInfo.ft_contract)
      setFtName(ftInfo.symbol)
      setFtImg(ftInfo.icon)
      setFtDecimals(ftInfo.decimals)
      let bidAmount = auctionInfo.highest_bid.bid / Math.pow(10, ftInfo.decimals)
      setLastBidDisplay(bidAmount)

      fetchPastBids();
    }
    if (auctionInfo) {
      getFtInfo();
    }
  }, [auctionInfo]);

  const bid = async (amount) => {
    let real_amount = amount * Math.pow(10, ftDecimals)
    let response = await wallet.callMethod({
      contractId: auctionInfo.ft_contract,
      method: "ft_transfer_call",
      deposit: 1,
      args: { "receiver_id": AUCTION_CONTRACT, "amount": String(real_amount), "msg": "" },
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
    try {
      const response = await fetch(`/api/getBidHistory?contractId=${AUCTION_CONTRACT}&ftId=${ftContract}`);
      const data = await response.json();
      setPastBids(data.pastBids);
    } catch (error) {
      console.log("Failed to fetch past bids", error);
    }
  }

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