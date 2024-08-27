import { useContext, useEffect, useState } from 'react';
import { NearContext } from '@/context';
import { getBidHistory } from '@/services/indexer';
import styles from './Bid.module.css';
import { toast } from 'react-toastify';

const Bid = ({ ftName, ftImg, lastBidDisplay, ftDecimals, action}) => {
  const [amount, setAmount] = useState(lastBidDisplay + 1);
  const [bidHistory, setBidHistory] = useState([]);
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
  
  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getBidHistory();
      setBidHistory(history);
    }
    fetchHistory();
  } , []);

  return (
    <div className={styles.historyContainer}>
      <h3>History</h3>
      <ul>
        {bidHistory?.map((bid, index) => (
          <li key={index} className={styles.bidItem}>
            <span> {bid[1] / Math.pow(10, ftDecimals)} {ftName} </span>
            <span> {bid[0]} </span>
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