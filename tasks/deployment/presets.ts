import { task, types } from 'hardhat/config';
import { WarperPresetFactory, WarperPresetFactory__factory } from '../../typechain';

task('deploy:erc721-preset-configurable', 'Deploy ERC721 preset configurable').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('ERC721PresetConfigurable');

  const deployment = await hre.deployments.deploy('ERC721PresetConfigurable', {
    from: deployer.address,
    args: [],
    log: true,
  });
  return deployment.address;
});

task('deploy:warper-preset-factory', 'Deploy Warper preset factory')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Delete the previous deployment
    await hre.deployments.delete('WarperPresetFactory_Proxy');
    await hre.deployments.delete('WarperPresetFactory_Implementation');

    const deployment = (await hre.upgrades.deployProxy(new WarperPresetFactory__factory(deployer), [acl], {
      kind: 'uups',
      initializer: 'initialize(address)',
    })) as WarperPresetFactory;
    return deployment.address;
  });
