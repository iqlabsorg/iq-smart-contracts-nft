import { task, types } from 'hardhat/config';
import { wait } from '..';
import {
  IAssetClassRegistry__factory,
  AssetClassRegistry,
  AssetClassRegistry__factory,
  ListingStrategyRegistry,
  ListingStrategyRegistry__factory,
  IListingStrategyRegistry__factory,
} from '../../typechain';

task('deploy:asset-class-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('AssetClassRegistry_Proxy');
    await hre.deployments.delete('AssetClassRegistry_Implementation');

    const assetClassRegistry = (await hre.upgrades.deployProxy(new AssetClassRegistry__factory(deployer), [], {
      kind: 'uups',
      initializer: false,
    })) as AssetClassRegistry;
    await wait(assetClassRegistry.initialize(acl));

    return IAssetClassRegistry__factory.connect(assetClassRegistry.address, deployer);
  });

task('deploy:listing-strategy-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('ListingStrategyRegistry_Proxy');
    await hre.deployments.delete('ListingStrategyRegistry_Implementation');

    const listingStrategyRegistry = (await hre.upgrades.deployProxy(
      new ListingStrategyRegistry__factory(deployer),
      [acl],
      {
        kind: 'uups',
        initializer: 'initialize(address)',
      },
    )) as ListingStrategyRegistry;

    return IListingStrategyRegistry__factory.connect(listingStrategyRegistry.address, deployer);
  });

export {};
