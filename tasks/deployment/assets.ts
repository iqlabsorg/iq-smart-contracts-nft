/* eslint-disable sonarjs/no-identical-functions, multiline-ternary */
import { task, types } from 'hardhat/config';
import { AssetClassRegistry__factory, ListingStrategyRegistry__factory } from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';
import { Contract } from 'ethers';

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
    const factory = new AssetClassRegistry__factory(deployer);
    const args = [acl];

    const safeDeployment = async (): Promise<Contract> => {
      return hre.upgrades.deployProxy(factory, args, {
        kind: 'uups',
        initializer: 'initialize(address)',
      });
    };

    const deployment = await (unsafe ? unsafeDeployment(factory, 'AssetClassRegistry', hre, args) : safeDeployment());
    await deployment.deployed();

    console.log('AssetClassRegistry deployed', deployment.address);
    return deployment;
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

    const safeDeployment = async (): Promise<Contract> => {
      return hre.upgrades.deployProxy(factory, args, {
        kind: 'uups',
        initializer: 'initialize(address)',
      });
    };

    const deployment = await (unsafe
      ? unsafeDeployment(factory, 'ListingStrategyRegistry', hre, args)
      : safeDeployment());

    await deployment.deployed();

    console.log('ListingStrategyRegistry deployed', deployment.address);
    return deployment;
  });

export {};
