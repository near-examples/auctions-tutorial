import { useEffect, useState } from 'react';
import styles from './Bid.module.css';
import { toast } from 'react-toastify';
import { useNear } from '@/hooks/useNear';

interface BidProps {
  pastBids: [string, number][] | string | null;
  lastBid: number;
  action: (amount: number) => Promise<void>;
}

const Bid = ({ pastBids, lastBid, action }: BidProps) => {
  const [amount, setAmount] = useState<number>(lastBid + 1);
  const { signedAccountId } = useNear();
  const nearMultiplier = Math.pow(10, 24);

  const handleBid = async () => {
    if (signedAccountId) {
      try {
        await action(amount);
  console.log('Bid placed successfully');
        toast.success('You have made a successful bid');
      } catch (err) {
        toast.error('Failed to place bid');
      }
    } else {
      toast.info('Please sign in to make a bid');
    }
  };

  useEffect(() => {
    setAmount(lastBid + 1);
  }, [lastBid]);

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
          onChange={(e) => setAmount(Number(e.target.value))}
          className={styles.inputField}
        />
        <button className={styles.bidButton} onClick={handleBid}>
          Bid
        </button>
      </div>
    </div>
  );
};

export default Bid;
