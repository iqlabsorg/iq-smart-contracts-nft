import { task } from 'hardhat/config';
import { ACL, ACL__factory } from '../../typechain';

task('deploy:acl', 'Deploy the `ACL` contract').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  // Delete the previous deployment
  await hre.deployments.delete('ACL_Proxy');
  await hre.deployments.delete('ACL_Implementation');

  const deployment = (await hre.upgrades.deployProxy(new ACL__factory(deployer), [], {
    kind: 'uups',
    initializer: 'initialize()',
  })) as ACL;

  return deployment.address;
});

export {};
