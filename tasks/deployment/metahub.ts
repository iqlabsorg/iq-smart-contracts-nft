import { task, types } from 'hardhat/config';
import { wait } from '..';
import {
  Metahub,
  Metahub__factory,
  IMetahub__factory,
  Rentings__factory,
  Listings__factory,
  Warpers__factory,
  Assets__factory,
} from '../../typechain';
import { MetahubLibraryAddresses } from '../../typechain/factories/Metahub__factory';

task('deploy:metahub', 'Deploy the `Metahub`, `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam('baseToken', 'The base token contract address', undefined, types.string)
  .addParam('listingStrategyRegistry', 'The `ListingStrategyRegistry` contract address', undefined, types.string)
  .addParam('assetClassRegistry', 'The `AssetClassRegistry` contract address', undefined, types.string)
  .addParam('rentalFeePercent', 'The rental fee percent on metahub', undefined, types.int)
  .addParam('warperPresetFactory', 'The address of warper preset factory', undefined, types.string)
  .addParam('universeRegistry', 'The address of the universe registry', undefined, types.string)
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
      },
      hre,
    ) => {
      const deployer = await hre.ethers.getNamedSigner('deployer');

      // Delete the previous deployment
      await hre.deployments.delete('Metahub_Proxy');
      await hre.deployments.delete('Metahub_Implementation');

      // Deploy external libraries used by Metahub.
      const rentingsLib = await new Rentings__factory(deployer).deploy();
      const listingsLib = await new Listings__factory(deployer).deploy();
      const assetsLib = await new Assets__factory(deployer).deploy();
      const warpersLib = await new Warpers__factory(deployer).deploy();

      const metahubLibs: MetahubLibraryAddresses = {
        ['contracts/renting/Rentings.sol:Rentings']: rentingsLib.address,
        ['contracts/listing/Listings.sol:Listings']: listingsLib.address,
        ['contracts/asset/Assets.sol:Assets']: assetsLib.address,
        ['contracts/warper/Warpers.sol:Warpers']: warpersLib.address,
      };

      // Deploy Metahub
      const metahub = (await hre.upgrades.deployProxy(new Metahub__factory(metahubLibs, deployer), [], {
        kind: 'uups',
        initializer: false,
        unsafeAllow: ['delegatecall', 'external-library-linking'],
      })) as Metahub;

      // Initializing Metahub.
      await wait(
        metahub.initialize({
          warperPresetFactory: warperPresetFactory,
          universeRegistry: universeRegistry,
          listingStrategyRegistry,
          assetClassRegistry,
          acl,
          baseToken,
          rentalFeePercent,
        }),
      );

      return IMetahub__factory.connect(metahub.address, deployer);
    },
  );

export {};
