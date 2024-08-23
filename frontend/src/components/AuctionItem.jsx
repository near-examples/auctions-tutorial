import styles from './AuctionItem.module.css';
import image from './images.jpeg';


const AuctionItem = ({ nftMetadata }) => {
  const cardImage = nftMetadata?.media 
    ? `https://image-cache-service-z3w7d7dnea-ew.a.run.app/media?url=https://arweave.net/${nftMetadata.media}` 
    : image

  return (
    <div className={styles.container}>
       <div className={styles.description}>
          <h2>{nftMetadata?.title}</h2>
          <p>{nftMetadata?.description}</p>
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