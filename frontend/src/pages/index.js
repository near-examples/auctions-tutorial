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
import { useRouter } from 'next/router';

export const getServerSideProps = async () => {
  console.log("Hello from getServerSideProps");
  try {
    // Get init transaction
    const initRes = await fetch('https://api-testnet.nearblocks.io/v1/account/auction-example.testnet/txns?method=init&page=1&per_page=25&order=desc', {
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    const initJson = await initRes.json();

    // Get all bid transactions
    const bidRes = await fetch('https://api-testnet.nearblocks.io/v1/account/auction-example.testnet/txns?from=dai.fakes.testnet&method=ft_on_transfer&page=1&per_page=25&order=desc', {
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });
    
    const bidJson = await bidRes.json();

    // Get the starting price from the init transaction
    const initArgs = initJson.txns[0].actions[1].args;
    const parsedInitArgs = JSON.parse(initArgs);
    const startingPrice = Number(parsedInitArgs.starting_price);

    const txns = bidJson.txns;
    let pastBids = [];

    // Add bids that are higher than the previous to the pastBids array
    for (let i = txns.length - 1; i >= 0; i--) {
        const txn = txns[i];

        let args = txn.actions[0].args;
        let parsedArgs = JSON.parse(args);
        let amount = Number(parsedArgs.amount);
        let account = parsedArgs.sender_id;

          if (pastBids.length > 0) {
            const last_amount = pastBids[pastBids.length - 1][1];
            if (amount > last_amount) {
              pastBids.push([account, amount]);
            }
          } else {
            if (amount > startingPrice) {
              pastBids.push([account, amount]);
            }
          }
    }

    return {
      props: {
        pastBids: pastBids.reverse().slice(0, 5)
      }
    }
  } catch (error) {
    console.log("Failed to fetch past bids", error);
  }
}
 

export default function Home({pastBids}) {
  const [auctionInfo, setAuctionInfo] = useState(null)
  const [nftInfo, setNftInfo] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(20)
  const [ftName, setFtName] = useState("")
  const [ftImg, setFtImg] = useState("")
  const [ftDecimals, setFtDecimals] = useState(0)
  const [lastBidDisplay, setLastBidDisplay] = useState(0)
  const [validAuction, setValidAuction] = useState("Invalid Auction")

  const { wallet } = useContext(NearContext);
  const router = useRouter();

  useEffect(() => {
    const getInfo = async () => {
      const data = await wallet.viewMethod({
        contractId: AUCTION_CONTRACT,
        method: "get_auction_info",
      });
      setAuctionInfo(data)
      
      router.replace(router.asPath); // Reload server side props
    }
    getInfo();

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