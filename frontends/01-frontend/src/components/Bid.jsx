import { useContext, useEffect, useState } from 'react';
import { NearContext } from '@/context';
import styles from './Bid.module.css';
import { toast } from 'react-toastify';

const Bid = ({pastBids, lastBid, action}) => {
  const [amount, setAmount] = useState(lastBidDisplay + 1);
  const { signedAccountId } = useContext(NearContext);
  const nearMultiplier = Math.pow(10, 24)

  const handleBid = async () => {
    if (signedAccountId) {
      await action(amount);
    toast("you have made a successful bid");
    } else {
      toast("Please sign in to make a bid");
    }
  }

  useEffect(() => {
    setAmount(lastBid + 1);
  }
  , [lastBid]);

  return (
    <div className={styles.historyContainer}>
      <h3>History</h3>
      {typeof pastBids === 'string' ? (
        <p className="error">{pastBids}</p>
      ) : pastBids === null ? (
        <p>Loading...</p> 
      ) : pastBids.length === 0 ? (
        <p>No bids have been placed yet</p>
      ) : (
        <ul>
          {pastBids?.map((bid, index) => (
            <li key={index} className={styles.bidItem}>
              <span>{bid[1] / nearMultiplier} $NEAR</span>
              <span>{bid[0]}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.container}>
        <input
          type="number"
          value={amount}
          min={lastBid}
          onChange={(e) => setAmount(e.target.value)}
          className={styles.inputField}
        > 
          $NEAR 
        </input>
        <button className={styles.bidButton} onClick={handleBid}>
          Bid
        </button>
      </div>
    </div>
  );
}

export default Bid;