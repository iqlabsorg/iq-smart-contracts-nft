import { task } from 'hardhat/config';

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

task('deploy:warper-preset-factory', 'Deploy Warper preset factory').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('WarperPresetFactory');

  const deployment = await hre.deployments.deploy('WarperPresetFactory', {
    from: deployer.address,
    args: [],
    log: true,
  });
  return deployment.address;
});
