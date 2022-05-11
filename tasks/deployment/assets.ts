import { task, types } from 'hardhat/config';
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
  .setAction(async ({ acl }: { acl: string }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const assetClassRegistry = (await hre.upgrades.deployProxy(new AssetClassRegistry__factory(deployer), [acl], {
      kind: 'uups',
      initializer: 'initialize(address)',
    })) as AssetClassRegistry;
    console.log('AssetClassRegistry deployed', assetClassRegistry.address);

    return IAssetClassRegistry__factory.connect(assetClassRegistry.address, deployer);
  });

task('deploy:listing-strategy-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const listingStrategyRegistry = (await hre.upgrades.deployProxy(
      new ListingStrategyRegistry__factory(deployer),
      [acl],
      {
        kind: 'uups',
        initializer: 'initialize(address)',
      },
    )) as ListingStrategyRegistry;
    console.log('ListingStrategyRegistry deployed', listingStrategyRegistry.address);

    return IListingStrategyRegistry__factory.connect(listingStrategyRegistry.address, deployer);
  });

export {};
