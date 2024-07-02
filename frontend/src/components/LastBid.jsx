import { FT, FTicon } from '@/config'
import styles from './LastBid.module.css';

const LastBid = ({lastBid,lastUpdate }) => {
  return (
    <div className={styles.priceSection}>
        <div className={styles.detail}>       
          <img className={styles.iconFT} src={FTicon} alt={FT} width="25" />
          <span className={styles.currentPrice}>${lastBid.bid} {FT}</span>
        </div>
        <span>By {lastBid.bidder} </span>
        <span>refresh in {lastUpdate}</span>
    </div>
  )
}

export default LastBid