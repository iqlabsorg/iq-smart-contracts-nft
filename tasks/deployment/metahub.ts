/* eslint-disable multiline-ternary */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import {
  Metahub,
  Metahub__factory,
  IMetahub__factory,
  Rentings__factory,
  Listings__factory,
  Warpers__factory,
  Assets__factory,
  Accounts__factory,
} from '../../typechain';
import { MetahubLibraryAddresses } from '../../typechain/factories/contracts/metahub/Metahub__factory';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:metahub', 'Deploy the `Metahub`, `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam('baseToken', 'The base token contract address', undefined, types.string)
  .addParam('listingStrategyRegistry', 'The `ListingStrategyRegistry` contract address', undefined, types.string)
  .addParam('assetClassRegistry', 'The `AssetClassRegistry` contract address', undefined, types.string)
  .addParam('rentalFeePercent', 'The rental fee percent on metahub', undefined, types.int)
  .addParam('warperPresetFactory', 'The address of warper preset factory', undefined, types.string)
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
        assetClassRegistry,
        listingStrategyRegistry,
        warperPresetFactory,
        universeRegistry,
        unsafe,
      }: {
        acl: string;
        baseToken: string;
        rentalFeePercent: string;
        assetClassRegistry: string;
        listingStrategyRegistry: string;
        warperPresetFactory: string;
        universeRegistry: string;
        unsafe: string;
      },
      hre,
    ) => {
      const deployer = await hre.ethers.getNamedSigner('deployer');

      // Deploy external libraries used by Metahub.
      const rentingsLib = await new Rentings__factory(deployer).deploy();
      console.log('rentingsLib', rentingsLib.address);
      const listingsLib = await new Listings__factory(deployer).deploy();
      console.log('listingsLib', listingsLib.address);
      const assetsLib = await new Assets__factory(deployer).deploy();
      console.log('assetsLib', assetsLib.address);
      const warpersLib = await new Warpers__factory(deployer).deploy();
      console.log('warpersLib', warpersLib.address);
      const accountsLib = await new Accounts__factory(deployer).deploy();
      console.log('accountsLib', accountsLib.address);

      const metahubLibs: MetahubLibraryAddresses = {
        'contracts/renting/Rentings.sol:Rentings': rentingsLib.address,
        'contracts/listing/Listings.sol:Listings': listingsLib.address,
        'contracts/asset/Assets.sol:Assets': assetsLib.address,
        'contracts/warper/Warpers.sol:Warpers': warpersLib.address,
        'contracts/accounting/Accounts.sol:Accounts': accountsLib.address,
      };

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
              Rentings: rentingsLib.address,
              Listings: listingsLib.address,
              Assets: assetsLib.address,
              Warpers: warpersLib.address,
              Accounts: accountsLib.address,
            },
            {
              // We perform the contract initialization at a later step manually
              execute: undefined,
            },
          )
        : safeDeployment());

      console.log('Metahub deployed at', metahub.address);

      // Initializing Metahub.
      {
        console.log('Initializing metahub: ');
        const tx = await metahub.initialize({
          warperPresetFactory: warperPresetFactory,
          universeRegistry: universeRegistry,
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
