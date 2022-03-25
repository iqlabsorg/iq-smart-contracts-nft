import { task, types } from 'hardhat/config';
import { wait } from '..';
import { Metahub, Metahub__factory, UniverseToken__factory, WarperPresetFactory__factory } from '../../typechain';

task('deploy:metahub-family', 'Deploy the `Metahub`, `UniverseToken` and `WarperPresetFactory` contracts.')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam('baseToken', 'The base token contract address', undefined, types.string)
  .addParam('assetClassRegistry', 'The `AssetClassRegistry` contract address', undefined, types.string)
  .addParam('rentalFeePercent', 'The rental fee percent on metahub', undefined, types.int)
  .setAction(async ({ acl, baseToken, rentalFeePercent, assetClassRegistry }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('Metahub_Proxy');
    await hre.deployments.delete('Metahub_Implementation');

    // Deploy warper preset factory.
    const warperPresetFactory = new WarperPresetFactory__factory(deployer).attach(
      await hre.run('deploy:warper-preset-factory'),
    );

    // Deploy Metahub
    const metahub = (await hre.upgrades.deployProxy(new Metahub__factory(deployer), [], {
      kind: 'uups',
      initializer: false,
      unsafeAllow: ['delegatecall'],
    })) as Metahub;

    // Deploy Universe token
    const deployedUniverseToken = await hre.run('deploy:universe-token', {
      acl: acl,
      metahub: metahub.address,
    });
    const universeToken = new UniverseToken__factory(deployer).attach(deployedUniverseToken);

    // Initializing Metahub.
    await wait(
      metahub.initialize({
        warperPresetFactory: warperPresetFactory.address,
        assetClassRegistry: assetClassRegistry,
        universeToken: universeToken.address,
        acl: acl,
        baseToken: baseToken,
        rentalFeePercent: rentalFeePercent,
      }),
    );

    return {
      metahub: metahub.address,
      universeToken: universeToken.address,
      warperPresetFactory: warperPresetFactory.address,
    };
  });

export {};
