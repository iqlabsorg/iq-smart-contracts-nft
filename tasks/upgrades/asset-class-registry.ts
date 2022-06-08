import { task, types } from 'hardhat/config';
import { AssetClassRegistry__factory } from '../../typechain';

task('upgrade:asset-class-registry', 'Deploy and upgrade the `AssetClassRegistry` contract.')
  .addParam('proxy', 'The AssetClassRegistry proxy contract address', undefined, types.string)
  .setAction(async ({ proxy }: { proxy: string }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const factory = new AssetClassRegistry__factory(deployer);
    const upgradedAssetClassRegistry = await hre.upgrades.upgradeProxy(proxy, factory, {
      unsafeAllow: ['delegatecall'],
    });
    console.log('AssetClassRegistry successfully upgraded!');
    return upgradedAssetClassRegistry;
  });
