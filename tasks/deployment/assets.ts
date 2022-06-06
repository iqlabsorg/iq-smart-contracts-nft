/* eslint-disable multiline-ternary */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import {
  IAssetClassRegistry__factory,
  AssetClassRegistry,
  AssetClassRegistry__factory,
  ListingStrategyRegistry,
  ListingStrategyRegistry__factory,
  IListingStrategyRegistry__factory,
} from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:asset-class-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl, unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');
    const args = [acl];
    const factory = new AssetClassRegistry__factory(deployer);

    const safeDeployment = async () => {
      return (await hre.upgrades.deployProxy(factory, args, {
        kind: 'uups',
        initializer: 'initialize(address)',
      })) as AssetClassRegistry;
    };

    const deployment = await (unsafe ? unsafeDeployment(factory, 'AssetClassRegistry', hre, args) : safeDeployment());
    await deployment.deployed();

    console.log('AssetClassRegistry deployed', deployment.address);
    return IAssetClassRegistry__factory.connect(deployment.address, deployer);
  });

task('deploy:listing-strategy-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl, unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');
    const args = [acl];
    const factory = new ListingStrategyRegistry__factory(deployer);

    const safeDeployment = async () => {
      return (await hre.upgrades.deployProxy(factory, [acl], {
        kind: 'uups',
        initializer: 'initialize(address)',
      })) as ListingStrategyRegistry;
    };

    const deployment = await (unsafe
      ? unsafeDeployment(factory, 'ListingStrategyRegistry', hre, args)
      : safeDeployment());
    await deployment.deployed();
    console.log('ListingStrategyRegistry deployed', deployment.address);
    return IListingStrategyRegistry__factory.connect(deployment.address, deployer);
  });

export {};
