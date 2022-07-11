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
  WarperManager,
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
import './warper-manager';
import './unsafe-deployment';
import { formatBytes32String } from 'ethers/lib/utils';
import { ASSET_CLASS, LISTING_STRATEGY } from '../../src';

export const PRESET_CONFIGURABLE_ID = formatBytes32String('ERC721PresetConfigurable');

task('deploy:initial-deployment', 'Deploy the initial deployment set')
  .addParam('baseToken', 'The base token contract address', undefined, types.string)
  .addParam('rentalFee', 'The base rental fee', 100, types.int)
  .addParam('acl', 'The ACL contract address (optional)', undefined, types.string, true)
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(
    async (
      {
        baseToken,
        rentalFee,
        acl,
        unsafe,
      }: { baseToken: string; rentalFee: number; acl: string | undefined; unsafe: boolean },
      hre,
    ) => {
      console.log('########################################################');
      console.log('Deploying all core contracts for IQ NFT renting platform');
      console.log('########################################################');
      console.log('');

      console.log('Step 1/15...');
      // Deploy the ACL contract (conditionally)
      let aclContract: ACL;
      if (acl === undefined) {
        aclContract = (await hre.run('deploy:acl', { unsafe })) as ACL;
      } else {
        aclContract = ACL__factory.connect(acl, await hre.ethers.getNamedSigner('deployer'));
      }

      console.log('Step 2/15...');
      // Deploy Asset Class Registry.
      const assetClassRegistry = (await hre.run('deploy:asset-class-registry', {
        acl: aclContract.address,
        unsafe,
      })) as AssetClassRegistry;

      console.log('Step 3/15...');
      // Deploy Listing Strategy Registry
      const listingStrategyRegistry = (await hre.run('deploy:listing-strategy-registry', {
        acl: aclContract.address,
        unsafe,
      })) as ListingStrategyRegistry;

      console.log('Step 4/15...');
      // Deploy Warper preset factory
      const warperPresetFactory = (await hre.run('deploy:warper-preset-factory', {
        acl: aclContract.address,
        unsafe,
      })) as WarperPresetFactory;

      console.log('Step 5/15...');
      // Deploy Universe token
      const universeRegistry = (await hre.run('deploy:universe-registry', {
        acl: aclContract.address,
        unsafe,
      })) as UniverseRegistry;

      console.log('Step 6/15...');
      // Deploy WarperManager
      const warperManager = (await hre.run('deploy:warper-manager', {
        acl: aclContract.address,
        warperPresetFactory: warperPresetFactory.address,
        assetClassRegistry: assetClassRegistry.address,
        universeRegistry: universeRegistry.address,
        unsafe,
      })) as WarperManager;

      console.log('Step 7/15...');
      // Deploy Metahub
      const metahub = (await hre.run('deploy:metahub', {
        acl: aclContract.address,
        universeRegistry: universeRegistry.address,
        assetClassRegistry: assetClassRegistry.address,
        warperManager: warperManager.address,
        listingStrategyRegistry: listingStrategyRegistry.address,
        baseToken: baseToken,
        rentalFeePercent: rentalFee,
        unsafe,
      })) as Metahub;

      console.log('Step 8/15...');
      // Deploy fixed price listing controller
      const fixedPriceListingController = (await hre.run('deploy:fixed-price-listing-controller', {
        unsafe,
      })) as FixedPriceListingController;

      console.log('Step 9/15...');
      // Deploy ERC721 Warper controller
      const erc721Controller = (await hre.run('deploy:erc721-warper-controller', { unsafe })) as ERC721WarperController;

      console.log('Step 10/15...');
      // Deploy ERC721 asset vault
      const erc721Vault = (await hre.run('deploy:erc721-asset-vault', {
        operator: metahub.address,
        acl: aclContract.address,
        unsafe,
      })) as ERC721AssetVault;

      console.log('Step 11/15...');
      // Deploy and register warper preset
      const erc721presetConfigurable = (await hre.run('deploy:erc721-preset-configurable', {
        unsafe,
      })) as ERC721PresetConfigurable;

      // Register the warper-configurable preset
      {
        console.log('Step 12/15...');
        const tx = await warperPresetFactory.addPreset(PRESET_CONFIGURABLE_ID, erc721presetConfigurable.address);
        console.log('tx: addPreset', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      // Register asset class
      {
        console.log('Step 13/15...');
        const tx = await assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
          controller: erc721Controller.address,
          vault: erc721Vault.address,
        });
        console.log('tx: registerAssetClass', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      // Register listing strategy
      {
        console.log('Step 14/15...');
        const tx = await listingStrategyRegistry.registerListingStrategy(LISTING_STRATEGY.FIXED_PRICE, {
          controller: fixedPriceListingController.address,
        });
        console.log('tx: registerListingStrategy', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      //  Set Metahub on the warper manager
      {
        console.log('Step 15/15...');
        const tx = await warperManager.setMetahub(metahub.address);
        console.log('tx: setMetahub', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      console.log('Metahub deployment succeeded...');

      return {
        erc721Controller: erc721Controller,
        erc721Vault: erc721Vault,
        acl: aclContract,
        erc721presetConfigurable: erc721presetConfigurable,
        assetClassRegistry: assetClassRegistry,
        listingStrategyRegistry: listingStrategyRegistry,
        warperPresetFactory: warperPresetFactory,
        warperManager: warperManager,
        universeRegistry: universeRegistry,
        metahub: metahub,
        fixedPriceListingController: fixedPriceListingController,
      };
    },
  );
