import { useEffect, useState } from 'react';
import styles from './Timer.module.css';
import { toast } from 'react-toastify';

interface TimerProps {
  endTime: string | number; 
  claimed: boolean;
  action: () => Promise<void>;
}

const Timer = ({ endTime, claimed, action }: TimerProps) => {
  const claim = async () => {
    await action();
    toast("Congratulations!!");
  };

  const initialTime = (Number(endTime) / 10 ** 6) - Date.now();
  const [time, setTime] = useState<number>(initialTime > 0 ? initialTime : 0);

  useEffect(() => {
    if (time <= 0) return;

    const timer = setInterval(() => {
      setTime((prevTime) => {
        const newTime = prevTime - 1000;
        if (newTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [time]);

  const formatTime = (timeMs: number) => {
    const allSeconds = Math.floor(timeMs / 1000);
    const days = Math.floor(allSeconds / (3600 * 24));
    const hours = Math.floor((allSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((allSeconds % 3600) / 60);
    const seconds = allSeconds % 60;

    return { allSeconds, days, hours, minutes, seconds };
  };

  const { allSeconds, days, hours, minutes, seconds } = formatTime(time);

  const showCounter = !claimed && allSeconds > 0;
  const showActionButton = !claimed && allSeconds <= 0;

  return (
    <>
      {claimed && (
        <div>
          <h2>Auction has been claimed!</h2>
        </div>
      )}
      {showCounter && (
        <div className={styles.timerContainer}>
          <h4>Time Remaining:</h4>
          <div className={styles.timer}>
            <div>
              <span>{String(days).padStart(2, '0')}</span> Days
            </div>
            <div>
              <span>{String(hours).padStart(2, '0')}</span> Hours
            </div>
            <div>
              <span>{String(minutes).padStart(2, '0')}</span> Minutes
            </div>
            <div>
              <span>{String(seconds).padStart(2, '0')}</span> Seconds
            </div>
          </div>
        </div>
      )}
      {showActionButton && (
        <div className={styles.timer}>
          <button className={styles.button} onClick={claim}>
            Claim
          </button>
        </div>
      )}
    </>
  );
};

export default Timer;
