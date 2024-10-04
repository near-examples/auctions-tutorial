import styles from './LastBid.module.css';

const LastBid = ({lastBid, lastUpdate, ftName, ftImg, lastBidDisplay }) => {
  return (
    <div className={styles.priceSection}>
        <div className={styles.detail}>       
          <span className={styles.currentPrice}>The last bid was {lastBidDisplay} {ftName} </span>
          <img className={styles.iconFT} src={ftImg} alt={ftName} width="25" />
        </div>
        <span>Made by {lastBid.bidder} </span>
        <span>Refresh page in {lastUpdate}</span>
    </div>
  )
}

export default LastBid