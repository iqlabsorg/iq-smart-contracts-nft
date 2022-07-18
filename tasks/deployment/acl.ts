import { Contract } from 'ethers';
import { task, types } from 'hardhat/config';
import { ACL__factory } from '../../typechain';
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
    const safeDeployment = async (): Promise<Contract> => {
      return hre.upgrades.deployProxy(factory, [], {
        kind: 'uups',
        initializer: 'initialize()',
      });
    };

    const deployment = await (unsafe ? unsafeDeployment(factory, 'ACL', hre) : safeDeployment());
    await deployment.deployed();

    console.log('ACL deployed', deployment.address);

    return deployment;
  });
