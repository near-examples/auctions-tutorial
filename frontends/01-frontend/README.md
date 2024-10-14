# Basic Auction Frontend

This directory contains a simple NextJS frontend for the basic auction contract (the first contract). It lets users bid on auctions, see the current highest bid, view historical bids, see the auction end time, and once finished the auction can be claimed. This follows the [Creating a Frontend](https://docs.near.org/tutorials/auction/creating-a-frontend) section of the auction tutorial.

To get historical bids an indexing API is used. The API requires a key (which is free) to use, read [this section](https://docs.near.org/tutorials/auction/indexing-historical-data#near-blocks-api-key) to see how to get and use your own key.

## Running the frontend

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```