import { task, types } from 'hardhat/config';
import { IERC721AssetVault__factory } from '../../typechain';

task('deploy:erc721-asset-vault', 'Deploy ERC721 Asset Vault')
  .addParam('acl', 'The ACL contract address', undefined, types.string)
  .addParam(
    'operator',
    'The entities address that will be able to transfer/withdraw assets to/from the vault',
    undefined,
    types.string,
  )
  .setAction(async ({ acl, operator }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    await hre.deployments.delete('ERC721AssetVault');

    const deployment = await hre.deployments.deploy('ERC721AssetVault', {
      from: deployer.address,
      args: [operator, acl],
      log: true,
    });

    return IERC721AssetVault__factory.connect(deployment.address, deployer);
  });
