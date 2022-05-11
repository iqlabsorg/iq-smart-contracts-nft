import { task, types } from 'hardhat/config';
import {
  ERC721PresetConfigurable__factory,
  IWarperPresetFactory__factory,
  WarperPresetFactory,
  WarperPresetFactory__factory,
} from '../../typechain';

task('deploy:erc721-preset-configurable', 'Deploy ERC721 preset configurable').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('ERC721PresetConfigurable');

  const deployment = await hre.deployments.deploy('ERC721PresetConfigurable', {
    from: deployer.address,
    args: [],
    log: true,
  });
  console.log('ERC721PresetConfigurable deployed', deployment.address);

  return new ERC721PresetConfigurable__factory(deployer).attach(deployment.address);
});

task('deploy:warper-preset-factory', 'Deploy Warper preset factory')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const deployment = (await hre.upgrades.deployProxy(new WarperPresetFactory__factory(deployer), [acl], {
      kind: 'uups',
      initializer: 'initialize(address)',
    })) as WarperPresetFactory;
    console.log('WarperPresetFactory deployed', deployment.address);

    return IWarperPresetFactory__factory.connect(deployment.address, deployer);
  });
