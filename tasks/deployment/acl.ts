import { task, types } from 'hardhat/config';

task('deploy:acl', 'Deploy the `ACL` contract').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  // Delete the previous deployment
  await hre.deployments.delete('ACL');

  const deployment = await hre.deployments.deploy('ACL', {
    from: deployer.address,
    args: [],
    log: true,
  });
  console.log('Deployed ACL', deployment.address);
  return deployment.address;
});

export {};
