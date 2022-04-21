import { task, types } from 'hardhat/config';
import { UniverseRegistry__factory } from '../../typechain';

task('deploy:universe-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('UniverseRegistry_Proxy');
    await hre.deployments.delete('UniverseRegistry_Implementation');

    // Deploy Universe token.
    return await hre.upgrades.deployProxy(new UniverseRegistry__factory(deployer), [acl], {
      kind: 'uups',
      unsafeAllow: ['delegatecall'],
    });
  });

export {};
