import styles from './LastBid.module.css';

const LastBid = ({lastBid, highestBidder, lastUpdate}) => {
  return (
    <div className={styles.priceSection}>
        <div className={styles.detail}>       
          <span className={styles.currentPrice}>The last bid was {lastBid} $NEAR </span>
        </div>
        <span>Made by {highestBidder} </span>
        <span>Refresh page in {lastUpdate}</span>
    </div>
  )
}

export default LastBid