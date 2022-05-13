/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import { ACL__factory, IACL } from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:acl', 'Deploy the `ACL` contract')
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(async ({ unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const factory = new ACL__factory(deployer);
    // Safe deployment
    const safeACL = async () => {
      return (await hre.upgrades.deployProxy(factory, [], {
        kind: 'uups',
        initializer: 'initialize()',
      })) as IACL;
    };

    const deployment = await (unsafe ? unsafeDeployment(factory, 'ACL', hre) : safeACL());
    console.log('ACL deployed', deployment.address);

    return deployment;
  });

export {};
