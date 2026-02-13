import { useEffect, useState, ChangeEvent } from "react";
import { toast } from "react-toastify";
import { useNear } from "@/hooks/useNear";
import styles from "./Bid.module.css";

interface BidProps {
  pastBids: [string, number][] | string | null;
  ftName: string;
  ftImg: string;
  lastBidDisplay: number;
  ftDecimals: number;
  action: (amount: number) => Promise<void>;
}

export default function Bid({
  pastBids,
  ftName,
  ftImg,
  lastBidDisplay,
  ftDecimals,
  action,
}: BidProps) {
  const [amount, setAmount] = useState<number>(lastBidDisplay + 1);
  const { signedAccountId } = useNear();

  const handleBid = async () => {
    if (signedAccountId) {
      try {
        await action(amount);
        toast.success("You have made a successful bid!");
      } catch (error) {
        console.error("Error placing bid:", error);
        toast.error("Failed to place bid. Please try again.");
      }
    } else {
      toast.info("Please sign in to make a bid.");
    }
  };

  useEffect(() => {
    setAmount(lastBidDisplay + 1);
  }, [lastBidDisplay]);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  return (
    <div className={styles.historyContainer}>
      <h3>History</h3>

      {typeof pastBids === "string" ? (
        <p className="error">{pastBids}</p>
      ) : pastBids === null ? (
        <p>Loading...</p>
      ) : pastBids.length === 0 ? (
        <p>No bids have been placed yet</p>
      ) : (
        <ul>
          {pastBids.map((bid, index) => (
            <li key={index} className={styles.bidItem}>
              <span>
                {bid[1] / Math.pow(10, ftDecimals)} {ftName}
              </span>
              <span>{bid[0]}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.container}>
        <input
          type="number"
          value={amount}
          min={lastBidDisplay}
          onChange={handleAmountChange}
          className={styles.inputField}
        />
        <button className={styles.bidButton} onClick={handleBid}>
          <img className={styles.iconFT} src={ftImg} alt={ftName} width={25} />
          Bid
        </button>
      </div>
    </div>
  );
}
