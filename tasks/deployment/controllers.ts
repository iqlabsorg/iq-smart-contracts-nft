import { task } from 'hardhat/config';
import { IAssetController__factory, IERC721WarperController__factory } from '../../typechain';

task('deploy:erc721-asset-controller', 'Deploy ERC721 Asset Controller').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('ERC721AssetController');

  const deployment = await hre.deployments.deploy('ERC721AssetController', {
    from: deployer.address,
    args: [],
    log: true,
  });

  return IAssetController__factory.connect(deployment.address, deployer);
});

task('deploy:erc721-warper-controller', 'Deploy ERC721 Asset Controller').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('ERC721WarperController');

  const deployment = await hre.deployments.deploy('ERC721WarperController', {
    from: deployer.address,
    args: [],
    log: true,
  });

  return IERC721WarperController__factory.connect(deployment.address, deployer);
});
