import { task, types } from 'hardhat/config';
import { wait } from '..';
import { UniverseToken, UniverseToken__factory } from '../../typechain';

task('deploy:universe-token', 'Deploy the `UniverseToken` contracts.')
  .addParam('aclAddress', 'The ACL contract address', undefined, types.string)
  .addParam('metahub', 'The base token contract address', undefined, types.string)
  .setAction(async ({ aclAddress, metahub }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('UniverseToken_Proxy');
    await hre.deployments.delete('UniverseToken_Implementation');

    // Deploy Universe token.
    const universeToken = (await hre.upgrades.deployProxy(new UniverseToken__factory(deployer), [], {
      kind: 'uups',
      initializer: false,
      unsafeAllow: ['delegatecall'],
    })) as UniverseToken;
    console.log('Deployed UniverseToken', universeToken.address);

    await wait(universeToken.initialize(metahub, aclAddress));
    console.log('Initialized Universe token');

    return universeToken.address;
  });

export {};
