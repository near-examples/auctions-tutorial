import styles from '@/styles/app.module.css';
import AuctionItem from '@/components/AuctionItem';
import Timer from '@/components/Timer';
import BidHistory from '@/components/BidHistory';
import { getInfo as getInfoHistory } from '@/services/history.service.mock';
import { useContext, useEffect, useState } from 'react';
import SkeletonAuctionItem from '@/components/Skeletons/SkeletonAuctionItem';
import SkeletonTimer from '@/components/Skeletons/SkeletonTimer';
import SkeletonBidHistory from '@/components/Skeletons/SkeletonBidHistory';
import { NearContext } from '@/context';
import { AuctionContract } from '@/config';
import LastBid from '@/components/LastBid';


export default function Home() {
  const [auctionInfo, setAuctionInfo] = useState(null)
  const [nft, setNft] = useState(null)
  const [history, setHistory] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [ftName, setFtName] = useState("")
  const [ftImg, setFtImg] = useState("")
  const [ftDecimals, setFtDecimals] = useState(0)
  const [lastBidDisplay, setLastBidDisplay] = useState(0)

  const { wallet } = useContext(NearContext);

  useEffect(() => {
    const getInfo = async () => {
      const data = await wallet.viewMethod({
        contractId: AuctionContract,
        method: "get_auction_info",
      });
      setAuctionInfo(data)
    }
    getInfo();

    const intervalId = setInterval(() => {
      getInfo();
      setSecondsRemaining(5);
    }, 5000);
    
    const countdownIntervalId = setInterval(() => {
      setSecondsRemaining(prev => (prev === 1 ? 5 : prev - 1));
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
      setNft(data)
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
      setFtName(ftInfo.symbol)
      setFtImg(ftInfo.icon)
      setFtDecimals(ftInfo.decimals)
      let bidAmount = auctionInfo.highest_bid.bid / Math.pow(10, ftInfo.decimals)
      setLastBidDisplay(bidAmount)
    }
    if (auctionInfo) {
      getFtInfo();
    }
  }, [auctionInfo]);

  useEffect(() => {
    const getHistoryInfo = async () => {
      const data = await getInfoHistory();
      setHistory(data)
    }

    getHistoryInfo();

  }, [])

  const bid = async (amount) => {
    let real_amount = amount * Math.pow(10, ftDecimals)
    let response = await wallet.callMethod({
      contractId: auctionInfo.ft_contract,
      method: "ft_transfer_call",
      deposit: 1,
      args: { "receiver_id": AuctionContract, "amount": String(real_amount), "msg": "" },
      gas:"300000000000000"
    })
    return response
  }

  const claim = async () => {
    let response = await wallet.callMethod({
      contractId: AuctionContract,
      method: "claim",
      gas:"300000000000000"
    })
    return response
  }

  return (
    <main className={styles.main}>
      <div className={styles.leftPanel}>
        {!auctionInfo ? <SkeletonAuctionItem /> : <LastBid lastBid={auctionInfo?.highest_bid} lastUpdate={secondsRemaining} ftName={ftName} ftImg={ftImg} lastBidDisplay={lastBidDisplay}/>} 
        {!auctionInfo ? <SkeletonAuctionItem /> : <AuctionItem nft={nft?.metadata} lastBid={auctionInfo?.highest_bid} lastUpdate={secondsRemaining} />}
      </div>
      <div className={styles.rightPanel}>
        {!auctionInfo ? <SkeletonTimer /> : <Timer endTime={auctionInfo.auction_end_time} claimed={auctionInfo?.claimed} action={claim}/>}
        {!auctionInfo ? <SkeletonBidHistory /> : <BidHistory bids={history} action={bid} lastBid={auctionInfo?.highest_bid} ftName={ftName} ftImg={ftImg} lastBidDisplay={lastBidDisplay} />}
      </div>
    </main>

  );
}