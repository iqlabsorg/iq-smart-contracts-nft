import { task } from 'hardhat/config';

task('deploy:erc721-asset-controller', 'Deploy ERC721 Asset Controller').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('ERC721AssetController');

  const deployment = await hre.deployments.deploy('ERC721AssetController', {
    from: deployer.address,
    args: [],
    log: true,
  });
  return deployment.address;
});
