/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { task, types } from 'hardhat/config';
import {
  ACL,
  ACL__factory,
  AssetClassRegistry,
  ERC721AssetVault,
  ERC721PresetConfigurable,
  ERC721WarperController,
  FixedPriceListingController,
  ListingStrategyRegistry,
  Metahub,
  UniverseRegistry,
  WarperPresetFactory,
} from '../../typechain';

import './acl';
import './metahub';
import './mocks';
import './presets';
import './vaults';
import './controllers';
import './universe';
import './assets';
import './listings';
import { formatBytes32String } from 'ethers/lib/utils';
import { ASSET_CLASS } from '../../test/shared/constants';

export const PRESET_CONFIGURABLE_ID = formatBytes32String('ERC721PresetConfigurable');

task('deploy:initial-deployment', 'Deploy the initial deployment set')
  .addParam('baseToken', 'The base token contract address', undefined, types.string)
  .addParam('rentalFee', 'The base rental fee', 100, types.int)
  .addParam('acl', 'The ACL contract address (optional)', undefined, types.string, true)
  .setAction(
    async ({ baseToken, rentalFee, acl }: { baseToken: string; rentalFee: number; acl: string | undefined }, hre) => {
      // Deploy the ACL contract (conditionally)
      let aclContract: ACL;
      if (acl === undefined) {
        aclContract = (await hre.run('deploy:acl')) as ACL;
      } else {
        aclContract = ACL__factory.connect(acl, await hre.ethers.getNamedSigner('deployer'));
      }

      // Deploy Asset Class Registry.
      const assetClassRegistry = (await hre.run('deploy:asset-class-registry', {
        acl: aclContract.address,
      })) as AssetClassRegistry;

      // Deploy Listing Strategy Registry
      const listingStrategyRegistry = (await hre.run('deploy:listing-strategy-registry', {
        acl: aclContract.address,
      })) as ListingStrategyRegistry;

      // Deploy Warper preset factory
      const warperPresetFactory = (await hre.run('deploy:warper-preset-factory', {
        acl: aclContract.address,
      })) as WarperPresetFactory;

      // Deploy Universe token
      const universeRegistry = (await hre.run('deploy:universe-registry', {
        acl: aclContract.address,
      })) as UniverseRegistry;

      // Deploy Metahub
      const metahub = (await hre.run('deploy:metahub', {
        acl: aclContract.address,
        universeRegistry: universeRegistry.address,
        warperPresetFactory: warperPresetFactory.address,
        listingStrategyRegistry: listingStrategyRegistry.address,
        assetClassRegistry: assetClassRegistry.address,
        baseToken: baseToken,
        rentalFeePercent: rentalFee,
      })) as Metahub;

      // Deploy fixed price listing controller
      const fixedPriceListingController = (await hre.run(
        'deploy:fixed-price-listing-controller',
      )) as FixedPriceListingController;

      // Deploy ERC721 Warper controller
      const erc721Controller = (await hre.run('deploy:erc721-warper-controller')) as ERC721WarperController;

      // Deploy ERC721 asset vault
      const erc721Vault = (await hre.run('deploy:erc721-asset-vault', {
        operator: metahub.address,
        acl: aclContract.address,
      })) as ERC721AssetVault;

      // Deploy and register warper preset
      const erc721presetConfigurable = (await hre.run('deploy:erc721-preset-configurable')) as ERC721PresetConfigurable;

      // Register the warper-configurable preset
      {
        const tx = await warperPresetFactory.addPreset(PRESET_CONFIGURABLE_ID, erc721presetConfigurable.address);
        console.log('tx: addPreset', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      {
        const tx = await assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
          controller: erc721Controller.address,
          vault: erc721Vault.address,
        });
        console.log('tx: registerAssetClass', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      return {
        erc721Controller: erc721Controller,
        erc721Vault: erc721Vault,
        acl: aclContract,
        erc721presetConfigurable: erc721presetConfigurable,
        assetClassRegistry: assetClassRegistry,
        listingStrategyRegistry: listingStrategyRegistry,
        warperPresetFactory: warperPresetFactory,
        universeRegistry: universeRegistry,
        metahub: metahub,
        fixedPriceListingController: fixedPriceListingController,
      };
    },
  );
