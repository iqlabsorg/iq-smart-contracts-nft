/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import { UniverseRegistry__factory } from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:universe-registry', 'Deploy the `UniverseRegistry` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(async ({ acl, unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const factory = new UniverseRegistry__factory(deployer);
    const args = [acl];

    const safeDeployment = async () => {
      return hre.upgrades.deployProxy(new UniverseRegistry__factory(deployer), [acl], {
        kind: 'uups',
        unsafeAllow: ['delegatecall'],
        initializer: 'initialize(address)',
      });
    };

    // Deploy Universe registry.
    const deployment = await (unsafe ? unsafeDeployment(factory, 'UniverseRegistry', hre, args) : safeDeployment());

    console.log('UniverseRegistry deployed', deployment.address);
    return deployment;
  });

export {};
