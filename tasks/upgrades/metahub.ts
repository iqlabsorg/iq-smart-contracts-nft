import { task, types } from 'hardhat/config';
import {
  Accounts__factory,
  Assets__factory,
  Listings__factory,
  Metahub__factory,
  Rentings__factory,
  Warpers__factory,
} from '../../typechain';
import { MetahubLibraryAddresses } from '../../typechain/factories/contracts/metahub/Metahub__factory';

task('upgrade:metahub', 'Deploy and upgrade the `Metahub` implementation contracts.')
  .addParam('proxy', 'The Metahub proxy contract address', undefined, types.string)
  .setAction(async ({ proxy }: { proxy: string }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');
    // Deploy external libraries used by Metahub.
    const rentingsLib = await new Rentings__factory(deployer).deploy();
    console.log('rentingsLib', rentingsLib.address);
    const listingsLib = await new Listings__factory(deployer).deploy();
    console.log('listingsLib', listingsLib.address);
    const assetsLib = await new Assets__factory(deployer).deploy();
    console.log('assetsLib', assetsLib.address);
    const warpersLib = await new Warpers__factory(deployer).deploy();
    console.log('warpersLib', warpersLib.address);
    const accountsLib = await new Accounts__factory(deployer).deploy();
    console.log('accountsLib', accountsLib.address);

    const metahubLibs: MetahubLibraryAddresses = {
      'contracts/renting/Rentings.sol:Rentings': rentingsLib.address,
      'contracts/listing/Listings.sol:Listings': listingsLib.address,
      'contracts/asset/Assets.sol:Assets': assetsLib.address,
      'contracts/warper/Warpers.sol:Warpers': warpersLib.address,
      'contracts/accounting/Accounts.sol:Accounts': accountsLib.address,
    };

    const factory = new Metahub__factory(metahubLibs, deployer);
    const newImplementation = await hre.upgrades.upgradeProxy(proxy, factory, {
      unsafeAllow: ['delegatecall', 'external-library-linking'],
    });
    console.log('The new metahub implementation', newImplementation);
    return newImplementation;
  });
