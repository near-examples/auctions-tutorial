import styles from './Skeleton.module.css';

const SkeletonTimer = () => {
  return (
    <div className={styles.timer}>
      <div>
        <span>99</span> Days
      </div>
      <div>
        <span>99</span> Hours
      </div>
      <div>
        <span>99</span> Minutes
      </div>
      <div>
        <span>99</span> Seconds
      </div>
    </div>


  );
}

export default SkeletonTimer;