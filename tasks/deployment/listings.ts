/* eslint-disable multiline-ternary, sonarjs/no-identical-functions */
import { Contract } from 'ethers';
import { task, types } from 'hardhat/config';
import { FixedPriceListingController__factory, FixedPriceWithRewardListingController__factory } from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:fixed-price-listing-controller', 'Deploy fixed price listing controller')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(async ({ acl, unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');
    const factory = new FixedPriceListingController__factory(deployer);
    const args = [acl];

    const safeDeployment = async (): Promise<Contract> => {
      return hre.upgrades.deployProxy(factory, args, {
        kind: 'uups',
        unsafeAllow: ['delegatecall'],
        initializer: 'initialize(address)',
      });
    };

    const deployment = await (unsafe
      ? unsafeDeployment(factory, 'FixedPriceListingController', hre, args)
      : safeDeployment());
    await deployment.deployed();

    console.log('FixedPriceListingController deployed', deployment.address);
    return deployment;
  });

task('deploy:fixed-price-with-reward-listing-controller', 'Deploy fixed price with reward listing controller')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(async ({ acl, unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');
    const factory = new FixedPriceWithRewardListingController__factory(deployer);
    const args = [acl];

    const safeDeployment = async (): Promise<Contract> => {
      return hre.upgrades.deployProxy(factory, args, {
        kind: 'uups',
        unsafeAllow: ['delegatecall'],
        initializer: 'initialize(address)',
      });
    };

    const deployment = await (unsafe
      ? unsafeDeployment(factory, 'FixedPriceWithRewardListingController', hre, args)
      : safeDeployment());
    await deployment.deployed();

    console.log('FixedPriceWithRewardListingController deployed', deployment.address);
    return deployment;
  });
