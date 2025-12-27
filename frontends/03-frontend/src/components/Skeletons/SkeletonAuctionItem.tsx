import styles from './Skeleton.module.css';

const SkeletonAuctionItem = () => {
  return (
    <div className={styles.container}>
      <div className={styles.imageSection}>
        <div className={styles.skeletonImage}></div>
        <div className={styles.description}>
          <div className={styles.skeletonText}></div>
          <div className={styles.skeletonText}></div>
          <div className={styles.skeletonStats}></div>
        </div>
      </div>
      <div className={styles.priceSection}>
        <div className={styles.skeletonPrice}></div>
        <div className={styles.skeletonButton}></div>
      </div>
    </div>
  );
}

export default SkeletonAuctionItem;