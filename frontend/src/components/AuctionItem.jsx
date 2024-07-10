import styles from './AuctionItem.module.css';
import image from './images.jpeg';


const AuctionItem = ({ nft }) => {
  const cardImage = nft?.media ? `https://image-cache-service-z3w7d7dnea-ew.a.run.app/media?url=https://arweave.net/${nft.media}` : image

  return (
    <div className={styles.container}>
       <div className={styles.description}>
          <h2>{nft?.title}</h2>
          <p>{nft?.description}</p>
        </div>
      <div className={styles.imageSection}>
        <img
          src={cardImage}
          alt="NFT"
        ></img>
      </div>
    </div>
  );
}

export default AuctionItem;