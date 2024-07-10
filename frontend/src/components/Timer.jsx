import { useEffect, useState } from 'react';
import styles from './Timer.module.css';
import { toast } from 'react-toastify';

const Timer = ({ endTime ,claimed,action }) => {
  const claim = async() =>{ 
    await action();
    toast("Congratulations!!")
  };

  const [time, setTime] = useState((Number(endTime) / 10 ** 6) - Date.now());
  useEffect(() => {
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
  }, []);

  const formatTime = (time) => {
    const allSeconds = Math.floor(time / 1000);
    const days = Math.floor(allSeconds / (3600 * 24));
    const hours = Math.floor((allSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((allSeconds % 3600) / 60);
    const seconds = allSeconds % 60;

    return { allSeconds, days, hours, minutes, seconds };
  };

  const { allSeconds, days, hours, minutes, seconds } = formatTime(time);

  const showCounter = !claimed && allSeconds > 0
  const showActionButton = !claimed && allSeconds <=0
  return (
    <>
      {claimed && <div>
            <h2>Auction has been claimed!</h2>
        </div>}
      {showCounter && (
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
      )}
      {showActionButton  && 
       <div className={styles.timer}>
          <button className={styles.button} onClick={claim}>
          Claim
        </button>
       </div>
      }
      
    </>
  );
};

export default Timer;