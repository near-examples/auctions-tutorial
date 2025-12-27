import styles from "./LastBid.module.css";

interface LastBidData {
  bidder: string;
}

interface LastBidProps {
  lastBid: LastBidData;
  lastUpdate: number;
  ftName: string;
  ftImg: string;
  lastBidDisplay: number;
}

export default function LastBid({
  lastBid,
  lastUpdate,
  ftName,
  ftImg,
  lastBidDisplay,
}: LastBidProps) {
  return (
    <div className={styles.priceSection}>
      <div className={styles.detail}>
        <span className={styles.currentPrice}>
          The last bid was {lastBidDisplay} {ftName}
        </span>
        <img className={styles.iconFT} src={ftImg} alt={ftName} width={25} />
      </div>

      <span>Made by {lastBid.bidder || "Unknown"}</span>
      <span>Refresh page in {lastUpdate}s</span>
    </div>
  );
}
