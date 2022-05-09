# IQ Protocol NFT

## Setup

1. Clone repository
2. Run `yarn`

## Commands

- `yarn compile`
- `yarn test`

## Generate docs

- pip install -r requirements.txt
- `yarn hardhato docgen`
- `mkdocs serve`

## Deployment

1. Create a `.env` file that resembles the `.env.example` file in the current directory.
2. Execute the script `yarn hardhat --network [netowrk name] deploy:initial-deployment --base-token [address]`
