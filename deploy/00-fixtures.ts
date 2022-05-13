/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ERC20, ERC721Mock } from '../typechain';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  // ----- Deploy mock coin ----- //
  const baseToken = (await hre.run('deploy:mock:ERC20', {
    name: 'Test ERC721',
    symbol: 'ONFT',
    decimals: 18,
    totalSupply: 100_000_000,
  })) as ERC20;

  // ----- Deploy Metahub & friends ----- //
  const {
    erc721Controller,
    erc721Vault,
    acl,
    erc721presetConfigurable,
    assetClassRegistry,
    listingStrategyRegistry,
    warperPresetFactory,
    universeRegistry,
    metahub,
    fixedPriceListingController,
  } = await hre.run('deploy:initial-deployment', {
    baseToken: baseToken.address,
    rentalFee: 100,
    unsafe: true, // Note: not using openzeppelin upgrades plugin
  });

  // ----- Deploy ERC721 token ----- //

  // Deploy an original NFT
  const originalAsset = (await hre.run('deploy:mock:ERC721', {
    name: 'Test ERC721',
    symbol: 'ONFT',
  })) as ERC721Mock;

  console.log('original NFT Asset', originalAsset.address);
  console.log('erc721Controller', erc721Controller.address);
  console.log('erc721Vault', erc721Vault.address);
  console.log('acl', acl.address);
  console.log('erc721presetConfigurable', erc721presetConfigurable.address);
  console.log('assetClassRegistry', assetClassRegistry.address);
  console.log('listingStrategyRegistry', listingStrategyRegistry.address);
  console.log('warperPresetFactory', warperPresetFactory.address);
  console.log('universeRegistry', universeRegistry.address);
  console.log('metahub', metahub.address);
  console.log('fixedPriceListingController', fixedPriceListingController.address);
};
export default func;

func.tags = ['test'];
