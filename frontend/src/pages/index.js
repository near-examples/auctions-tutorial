import styles from '@/styles/app.module.css';
import AuctionItem from '@/components/AuctionItem';
import Timer from '@/components/Timer';
import BidHistory from '@/components/BidHistory';
// import { getInfo as getInfoAuction } from '@/services/auction.service.mock';
// import { getInfo as getInfoNFT } from '@/services/nft.service.mock';
import { getInfo as getInfoHistory } from '@/services/history.service.mock';
import { useContext, useEffect, useState } from 'react';
import SkeletonAuctionItem from '@/components/Skeletons/SkeletonAuctionItem';
import SkeletonTimer from '@/components/Skeletons/SkeletonTimer';
import SkeletonBidHistory from '@/components/Skeletons/SkeletonBidHistory';
import { NearContext } from '@/context';
import { AuctionContract, FTContract, NFTContract } from '@/config';
import LastBid from '@/components/LastBid';



export default function Home() {
  const [auctionContract, setAuctionContract] = useState(null)
  const [nft, setNft] = useState(null)
  const [history, setHistory] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  const { wallet } = useContext(NearContext);

  useEffect(() => {
    const getInfo = async () => {
      const data = await wallet.viewMethod({
        contractId: AuctionContract,
        method: "get_info",
      });
      setAuctionContract(data)
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
    const getInfo = async () => {
      const data = await await wallet.viewMethod({
        contractId: NFTContract,
        method: "nft_token",
        args: { token_id: auctionContract.token_id }
      });
      setNft(data)
    }
    if (auctionContract) {
      getInfo();
    }

  }, [auctionContract])

  useEffect(() => {
    const getInfo = async () => {
      const data = await getInfoHistory();
      setHistory(data)
    }

    getInfo();

  }, [])

  const bid = async (amount) => {
    let response = await wallet.callMethod({
      contractId: FTContract,
      method: "ft_transfer_call",
      deposit: 1,
      args: { "receiver_id": AuctionContract, "amount": amount, "msg": "" },
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
        {!auctionContract ? <SkeletonAuctionItem /> : <LastBid lastBid={auctionContract?.highest_bid} lastUpdate={secondsRemaining} />} 
        {!auctionContract ? <SkeletonAuctionItem /> : <AuctionItem nft={nft?.metadata} lastBid={auctionContract?.highest_bid} lastUpdate={secondsRemaining} />}
      </div>
      <div className={styles.rightPanel}>
        {!auctionContract ? <SkeletonTimer /> : <Timer endTime={auctionContract.auction_end_time} claimed={auctionContract?.claimed} action={claim}/>}
        {!auctionContract ? <SkeletonBidHistory /> : <BidHistory bids={history} action={bid} lastBid={auctionContract?.highest_bid} />}
      </div>
    </main>

  );
}