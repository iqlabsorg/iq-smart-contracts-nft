/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import {
  ERC721PresetConfigurable__factory,
  IWarperPresetFactory__factory,
  WarperPresetFactory,
  WarperPresetFactory__factory,
} from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';

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
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .setAction(async ({ acl, unsafe }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');
    const factory = new WarperPresetFactory__factory(deployer);
    const args = [acl];

    const safeDeployment = async () => {
      return (await hre.upgrades.deployProxy(factory, args, {
        kind: 'uups',
        initializer: 'initialize(address)',
      })) as WarperPresetFactory;
    };

    const deployment = await (unsafe ? unsafeDeployment(factory, 'WarperPresetFactory', hre, args) : safeDeployment());
    await deployment.deployed();

    console.log('WarperPresetFactory deployed', deployment.address);
    return IWarperPresetFactory__factory.connect(deployment.address, deployer);
  });
