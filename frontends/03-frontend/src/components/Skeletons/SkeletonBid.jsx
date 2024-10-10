import styles from './Skeleton.module.css';

const SkeletonBid = () => {
  return (
    <div className={styles.historyContainer}>
      <h3>History</h3>
      <ul>
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className={styles.bidItem}>
            <div className={styles.skeletonText}></div>
            <div className={styles.skeletonText}></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SkeletonBid;
