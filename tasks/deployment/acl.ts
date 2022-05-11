import { task } from 'hardhat/config';
import { ACL__factory, IACL } from '../../typechain';

task('deploy:acl', 'Deploy the `ACL` contract').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  const deployment = (await hre.upgrades.deployProxy(new ACL__factory(deployer), [], {
    kind: 'uups',
    initializer: 'initialize()',
  })) as IACL;
  console.log('ACL deployed', deployment.address);

  return deployment;
});

export {};
