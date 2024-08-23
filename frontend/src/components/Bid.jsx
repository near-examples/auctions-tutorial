import { useContext, useEffect, useState } from 'react';
import { NearContext } from '@/context';
import styles from './Bid.module.css';
import { toast } from 'react-toastify';

const Bid = ({ bids, ftName, ftImg, lastBidDisplay, action}) => {
  const [amount, setAmount] = useState(lastBidDisplay + 1);
  const { signedAccountId } = useContext(NearContext);

  const handleBid = async () => {
    if (signedAccountId) {
      await action(amount);
    toast("you have made a successful bid");
    } else {
      toast("Please sign in to make a bid");
    }
  }

  useEffect(() => {
    setAmount(lastBidDisplay + 1);
  }
  , [lastBidDisplay]);

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
          min={lastBidDisplay}
          onChange={(e) => setAmount(e.target.value)}
          className={styles.inputField}
        />
        <button className={styles.bidButton} onClick={handleBid}>
        <img className={styles.iconFT} src={ftImg} alt={ftName} width="25" /> Bid
        </button>
      </div>

    </div>
  );
}

export default Bid;