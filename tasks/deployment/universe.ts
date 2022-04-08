import { task, types } from 'hardhat/config';
import { wait } from '..';
import { IUniverseRegistry__factory, UniverseRegistry, UniverseRegistry__factory } from '../../typechain';

task('deploy:universe-registry', 'Deploy the `UniverseToken` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('UniverseRegistry_Proxy');
    await hre.deployments.delete('UniverseRegistry_Implementation');

    // Deploy Universe token.
    const universeRegistry = (await hre.upgrades.deployProxy(new UniverseRegistry__factory(deployer), [], {
      kind: 'uups',
      initializer: false,
      unsafeAllow: ['delegatecall'],
    })) as UniverseRegistry;

    await wait(universeRegistry.initialize(acl));

    return IUniverseRegistry__factory.connect(universeRegistry.address, deployer);
  });

export {};
