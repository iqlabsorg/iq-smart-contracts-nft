# IQ Protocol NFT

## Docs

- [Contract documentation](https://iqlabsorg.github.io/iq-smart-contracts-nft/)

## Setup

1. Clone repository
2. Run `yarn`

## Compilation

```shell
yarn compile
```

## Testing
```shell
yarn test
```

## Generate docs

```shell
pip install -r requirements.txt
yarn hardhato docgen
mkdocs serve
```

## Tasks
Many of the protocol maintenance routines are automated using [hardhat tasks](https://hardhat.org/hardhat-runner/docs/guides/tasks-and-scripts#writing-hardhat-tasks). Find the list of available commands by running: 
```shell
hardhat --help
```

## Deployment

The deployment process is automated via hardhat tasks, which can be found under `tasks/deployment` directory. 

### Testing purposes (for testnet deployments)

1. A payment token: `yarn hardhat --network [network name] deploy:mock:ERC20 --name USDC --symbol USDC`
2. An NFT collection: `yarn hardhat --network [network name] deploy:mock:ERC721-internal-tests --name TEST --symbol TT`

### Initial deployment
The following command sequence will deploy the protocol from scratch. This process covers the deployment of all core contracts and initial configuration. 

1. Create a `.env` file that resembles the `.env.example` file in the current directory.
2. Execute the script `yarn hardhat --network [network name] deploy:initial-deployment --base-token [address]`

## Upgrades
**Beware:** Upgrading smart contracts requires extra caution, as this can lead to data loss and break the protocol.

Some protocol contracts are upgradeable. This allows extending functionality and fixing the security issues.
The upgradeability process can be automated via hardhat tasks. You can find some examples of upgrade tasks under `tasks/upgrades` directory.
In order to reduce the risks, the protocol relies on [OZ Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/) for deploying and upgrading contracts. 

## Publish to NPM

1. manually update the version in `package.json`
2. yarn build
3. yarn run publish


## Manual contract verification

- Every time the deployment command is executed, a new set of deployment artifacts is created under
`deployments/<network>`. The `deployments/<network>/solcInputs` directory will contain a new [Standard JSON-input](https://docs.soliditylang.org/en/latest/using-the-compiler.html#input-description) file which can be used for
contract verification.
- Verifying Metahub requires extra care. It uses dynamically linked libraries, but those do not get attached to the deployment artifact. It means that you need to edit this JSON field manually and add the deployed library addresses:

```json
...
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "outputSelection": {
      "*": {
        "*": [
          "storageLayout",
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.methodIdentifiers",
          "metadata",
          "devdoc",
          "userdoc",
          "evm.gasEstimates"
        ],
        "": [
          "ast"
        ]
      }
    },
    "metadata": {
      "useLiteralContent": true
    },
    // This is the part you need to add manually
    "libraries": {
      "contracts/renting/Rentings.sol": {
        // The addresses get logged to the terminal when deploying the Metahub contract.
        "Rentings": "0xF6188F991962dBcEF5621312515BeEE566989Df0"
      },
      "contracts/listing/Listings.sol": {
        "Listings": "0xd0bdF81Aca69FC6B28de655c0464451f25A0cdfA"
      },
      "contracts/asset/Assets.sol": {
        "Assets": "0x4778CE9b59c5E9e287Ed50f4671c98F4b7557A72"
      },
      "contracts/warper/Warpers.sol": {
        "Warpers": "0x529Bd1D28bECeC204a817D2dE6530638A8AEda72"
      },
      "contracts/accounting/Accounts.sol": {
        "Accounts": "0xD40925d61751BDFab9ff4b163a3793177EbDc0AA"
      }
    }
  }
...
```
