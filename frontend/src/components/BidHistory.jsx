import { useState } from 'react';
import styles from './BidHistory.module.css';
import { toast } from 'react-toastify';
import { FT, FTicon } from '@/config';

const BidHistory = ({ bids, action, lastBid }) => {
  const [amount, setAmount] = useState(lastBid.bid)

  const handleBid = async () => {
    await action(amount);
    toast("you have made a successful bid");
  }

  return (
    <div className={styles.historyContainer}>
      <h3>History</h3>
      <ul>
        {bids?.map((bid, index) => (
          <li key={index} className={styles.bidItem}>
            <span>{bid.amount}</span>
            <span>{bid.time}</span>
            <span>{bid.account}</span>
          </li>
        ))}
      </ul>
      <div className={styles.container}>
        <input
          type="number"
          value={amount}
          min={lastBid.bid}
          onChange={(e) => setAmount(e.target.value)}
          className={styles.inputField}
        />
        <button className={styles.bidButton} onClick={handleBid}>
        <img className={styles.iconFT} src={FTicon} alt={FT} width="25" /> Bid
        </button>
      </div>

    </div>
  );
}

export default BidHistory;