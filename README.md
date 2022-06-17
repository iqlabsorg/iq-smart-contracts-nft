# IQ Protocol NFT

## Docs

- [Contract documentation](https://iqlabsorg.github.io/iq-smart-contracts-nft/)

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

### Testing purposes (for testnet deployments)

1. A payment token: `yarn hardhat --network [network name] deploy:mock:ERC20 --name USDC --symbol USDC`
2. An NFT collection: `yarn hardhat --network [network name] deploy:mock:ERC721-internal-tests --name TEST --symbol TT`

### Metahub & friends

1. Create a `.env` file that resembles the `.env.example` file in the current directory.
2. Execute the script `yarn hardhat --network [network name] deploy:initial-deployment --base-token [address]`


## Publish to NPM

1. yarn build
2. yarn run publish
