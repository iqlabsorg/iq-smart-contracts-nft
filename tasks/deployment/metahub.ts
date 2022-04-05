import { task, types } from 'hardhat/config';
import { wait } from '..';
import { Metahub, Metahub__factory } from '../../typechain';

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

      // Deploy Metahub
      const metahub = (await hre.upgrades.deployProxy(new Metahub__factory(deployer), [], {
        kind: 'uups',
        initializer: false,
        unsafeAllow: ['delegatecall'],
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

      return metahub.address;
    },
  );

export {};
