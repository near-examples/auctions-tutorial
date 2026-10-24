import styles from './AuctionItem.module.css';

const AuctionItem = ({ nftMetadata, validAuction }) => {
  const media = nftMetadata?.media;
  const cardImage = !media ? null : media.startsWith('ipfs://')
    ? `https://ipfs.io/ipfs/${media.slice(7)}`
    : /^https?:\/\//.test(media) ? media : `https://arweave.net/${media}`;

  return (
    <div className={styles.container}>
       <div className={styles.description}>
          <p>{validAuction}</p>
          <h2>{nftMetadata?.title}</h2>
          <p>{nftMetadata?.description}</p>
        </div>
      <div className={styles.imageSection}>
        {cardImage && (
        <img
          src={cardImage}
          alt="NFT"
        />
        )}
      </div>
    </div>
  );
}

export default AuctionItem;