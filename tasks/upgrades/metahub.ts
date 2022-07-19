import { task, types } from 'hardhat/config';
import { Metahub__factory } from '../../typechain';
import { MetahubLibraryAddresses } from '../../typechain/factories/contracts/metahub/Metahub__factory';

task('upgrade:metahub', 'Deploy and upgrade the `Metahub` implementation contracts.')
  .addParam('proxy', 'The Metahub proxy contract address', undefined, types.string)
  .setAction(async ({ proxy }: { proxy: string }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    // Deploy external libraries used by Metahub.
    const metahubLibs = (await hre.run('deploy:metahub-libraries')) as MetahubLibraryAddresses;

    const factory = new Metahub__factory(metahubLibs, deployer);
    const upgradedMetahub = await hre.upgrades.upgradeProxy(proxy, factory, {
      unsafeAllow: ['delegatecall', 'external-library-linking'],
    });
    console.log('Metahub successfully upgraded!');
    return upgradedMetahub;
  });
