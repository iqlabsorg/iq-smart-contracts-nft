import { task, types } from 'hardhat/config';
import { UniverseRegistry__factory } from '../../typechain';

task('deploy:universe-registry', 'Deploy the `UniverseRegistry` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Deploy Universe registry.
    const deployment = await hre.upgrades.deployProxy(new UniverseRegistry__factory(deployer), [acl], {
      kind: 'uups',
      unsafeAllow: ['delegatecall'],
      initializer: 'initialize(address)',
    });
    console.log('UniverseRegistry deployed', deployment.address);
    return deployment;
  });

export {};
