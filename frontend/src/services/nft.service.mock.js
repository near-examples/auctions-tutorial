import NFT from './nft.webp';

export const getInfo = async (token_id) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockData = {
        "token_id": token_id,
        "owner_id": "bob.near",
        "metadata": {
          "title": "Tokenfox Silver Coin #1154",
          "description": null,
          "media": NFT,
          "media_hash": null,
          "copies": 4063,
          "issued_at": "1642053411068358156",
          "expires_at": null,
          "starts_at": null,
          "updated_at": null,
          "extra": null,
          "reference": "bafkreib6uj5kxbadfvf6qes5flema7jx6u5dj5zyqcneaoyqqzlm6kpu5a",
          "reference_hash": null
        },
        "approved_account_ids": {}
      };

    return mockData;
};