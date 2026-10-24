import { formatUnits, nextBid } from '@/utils/amounts.mjs';
import { useContext, useEffect, useState } from 'react';
import { NearContext } from '@/context';
import styles from './Bid.module.css';
import { toast } from 'react-toastify';

const Bid = ({pastBids, lastBid, action}) => {
  const [amount, setAmount] = useState(nextBid(lastBid, 24));
  const { signedAccountId } = useContext(NearContext);


  const [pending, setPending] = useState(false);
  const handleBid = async () => {
    if (!signedAccountId) return toast.error('Please sign in to make a bid');
    setPending(true);
    try {
      await action(amount);
      toast.success('Your bid was submitted');
    } catch (error) {
      toast.error(error.message || 'Bid failed');
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    setAmount(nextBid(lastBid, 24));
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
              <span>{formatUnits(bid[1], 24)} $NEAR</span>
              <span>{bid[0]}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.container}>
        <input
          type="number"
          step="any"
          value={amount}
          min={lastBid}
          onChange={(e) => setAmount(e.target.value)}
          className={styles.inputField}
        /> 
        <button className={styles.bidButton} onClick={handleBid} disabled={pending}>
          Bid
        </button>
      </div>
    </div>
  );
}

export default Bid;