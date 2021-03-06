/* eslint-disable multiline-ternary */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import {
  Accounts__factory,
  Assets__factory,
  IMetahub__factory,
  Listings__factory,
  Metahub,
  Metahub__factory,
  Rentings__factory,
  Warpers__factory,
} from '../../typechain';
import { MetahubLibraryAddresses } from '../../typechain/factories/contracts/metahub/Metahub__factory';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:metahub-libraries', 'Deploy the `Metahub` libraries').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  console.log('Deploying external libraries used by Metahub:');
  const rentingsLib = await new Rentings__factory(deployer).deploy();
  await rentingsLib.deployed();
  console.log('rentingsLib', rentingsLib.address);
  const listingsLib = await new Listings__factory(deployer).deploy();
  await listingsLib.deployed();
  console.log('listingsLib', listingsLib.address);
  const assetsLib = await new Assets__factory(deployer).deploy();
  await assetsLib.deployed();
  console.log('assetsLib', assetsLib.address);
  const warpersLib = await new Warpers__factory(deployer).deploy();
  await warpersLib.deployed();
  console.log('warpersLib', warpersLib.address);
  const accountsLib = await new Accounts__factory(deployer).deploy();
  await accountsLib.deployed();
  console.log('accountsLib', accountsLib.address);

  const metahubLibs: MetahubLibraryAddresses = {
    'contracts/renting/Rentings.sol:Rentings': rentingsLib.address,
    'contracts/listing/Listings.sol:Listings': listingsLib.address,
    'contracts/asset/Assets.sol:Assets': assetsLib.address,
    'contracts/accounting/Accounts.sol:Accounts': accountsLib.address,
  };
  return metahubLibs;
});

task('deploy:metahub', 'Deploy the `Metahub` contract.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam('baseToken', 'The base token contract address', undefined, types.string)
  .addParam('listingStrategyRegistry', 'The `ListingStrategyRegistry` contract address', undefined, types.string)
  .addParam('assetClassRegistry', 'The `AssetClassRegistry` contract address', undefined, types.string)
  .addParam('rentalFeePercent', 'The rental fee percent on metahub', undefined, types.int)
  .addParam('warperManager', 'The address of the warperManager', undefined, types.string)
  .addParam('universeRegistry', 'The address of the universe registry', undefined, types.string)
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(
    async (
      {
        acl,
        baseToken,
        rentalFeePercent,
        listingStrategyRegistry,
        warperManager,
        universeRegistry,
        assetClassRegistry,
        unsafe,
      }: {
        acl: string;
        baseToken: string;
        rentalFeePercent: string;
        listingStrategyRegistry: string;
        warperManager: string;
        assetClassRegistry: string;
        universeRegistry: string;
        unsafe: string;
      },
      hre,
    ) => {
      const deployer = await hre.ethers.getNamedSigner('deployer');

      const metahubLibs = (await hre.run('deploy:metahub-libraries')) as MetahubLibraryAddresses;
      const factory = new Metahub__factory(metahubLibs, deployer);

      // Safe deployment
      const safeDeployment = async () => {
        return (await hre.upgrades.deployProxy(factory, [], {
          kind: 'uups',
          initializer: false,
          unsafeAllow: ['delegatecall', 'external-library-linking'],
        })) as Metahub;
      };

      // Deploy Metahub
      const metahub = await (unsafe
        ? unsafeDeployment(
            factory,
            'Metahub',
            hre,
            [],
            {
              Rentings: metahubLibs['contracts/renting/Rentings.sol:Rentings'],
              Listings: metahubLibs['contracts/listing/Listings.sol:Listings'],
              Assets: metahubLibs['contracts/asset/Assets.sol:Assets'],
              Accounts: metahubLibs['contracts/accounting/Accounts.sol:Accounts'],
            },
            {
              // We perform the contract initialization at a later step manually
              execute: undefined,
            },
          )
        : safeDeployment());
      await metahub.deployed();

      console.log('Metahub deployed at', metahub.address);

      // Initializing Metahub.
      {
        console.log('Initializing metahub: ');
        const tx = await metahub.initialize({
          warperManager,
          universeRegistry,
          listingStrategyRegistry,
          assetClassRegistry,
          acl,
          baseToken,
          rentalFeePercent,
        });
        console.log(`tx hash: ${tx.hash} | gas price ${tx.gasPrice?.toString() ?? ''}`);
        await tx.wait();
      }

      console.log('Metahub', metahub.address);

      return IMetahub__factory.connect(metahub.address, deployer);
    },
  );

export {};
