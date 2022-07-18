/* eslint-disable @typescript-eslint/no-unsafe-assignment,sonarjs/no-duplicate-string */
import { task, types } from 'hardhat/config';
import {
  ACL,
  ACL__factory,
  AssetClassRegistry,
  ERC721AssetVault,
  ERC721PresetConfigurable,
  ERC721WarperController,
  FixedPriceListingController,
  FixedPriceWithRewardListingController,
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
import { Contract } from 'ethers';

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
      console.log();
      console.log('#############################################################');
      console.log('# Deploying all core contracts for IQ NFT renting platform #');
      console.log('#############################################################');
      console.log();

      let aclContract: ACL;
      if (acl === undefined) {
        console.log('Deploying the ACL contract...');
        aclContract = await hre.run('deploy:acl', { unsafe });
      } else {
        console.log(`Using the provided ACL contract ${acl}`);
        aclContract = ACL__factory.connect(acl, await hre.ethers.getNamedSigner('deployer'));
      }

      console.log('Deploying Asset Class Registry...');
      const assetClassRegistry = (await hre.run('deploy:asset-class-registry', {
        acl: aclContract.address,
        unsafe,
      })) as AssetClassRegistry;

      console.log('Deploying Listing Strategy Registry...');
      const listingStrategyRegistry = (await hre.run('deploy:listing-strategy-registry', {
        acl: aclContract.address,
        unsafe,
      })) as ListingStrategyRegistry;

      console.log('Deploying Warper Preset Factory...');
      const warperPresetFactory = (await hre.run('deploy:warper-preset-factory', {
        acl: aclContract.address,
        unsafe,
      })) as WarperPresetFactory;

      console.log('Deploying Universe Registry...');
      const universeRegistry = (await hre.run('deploy:universe-registry', {
        acl: aclContract.address,
        unsafe,
      })) as UniverseRegistry;

      console.log('Deploying Warper Manager...');
      const warperManager = (await hre.run('deploy:warper-manager', {
        acl: aclContract.address,
        warperPresetFactory: warperPresetFactory.address,
        assetClassRegistry: assetClassRegistry.address,
        universeRegistry: universeRegistry.address,
        unsafe,
      })) as WarperManager;

      console.log('Deploying Metahub...');
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

      {
        console.log('Linking Metahub with the warper manager...');
        const tx = await warperManager.setMetahub(metahub.address);
        console.log('tx: setMetahub', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      console.log();
      console.log('=============================');
      console.log('Enabling ERC721 Asset Support');
      console.log('=============================');
      console.log();

      console.log('Deploying ERC721 asset vault...');
      const erc721Vault = (await hre.run('deploy:erc721-asset-vault', {
        operator: metahub.address,
        acl: aclContract.address,
        unsafe,
      })) as ERC721AssetVault;

      console.log('Deploying ERC721 Warper controller...');
      const erc721Controller = (await hre.run('deploy:erc721-warper-controller', { unsafe })) as ERC721WarperController;

      {
        console.log('Registering ERC721 asset class...');
        const tx = await assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
          controller: erc721Controller.address,
          vault: erc721Vault.address,
        });
        console.log('tx: registerAssetClass', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      console.log('Deploying ERC721PresetConfigurable...');
      const erc721presetConfigurable = (await hre.run('deploy:erc721-preset-configurable', {
        unsafe,
      })) as ERC721PresetConfigurable;

      console.log('Registering the ERC721PresetConfigurable preset...');
      {
        const tx = await warperPresetFactory.addPreset(PRESET_CONFIGURABLE_ID, erc721presetConfigurable.address);
        console.log('tx: addPreset', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      console.log();
      console.log('===================================');
      console.log('Enabling default listing strategies');
      console.log('===================================');
      console.log();

      // FIXED_PRICE
      console.log('Deploying  Fixed Price Listing Controller...');
      const fixedPriceListingController = (await hre.run('deploy:fixed-price-listing-controller', {
        acl: aclContract.address,
        unsafe,
      })) as FixedPriceListingController;
      {
        console.log('Registering FIXED_PRICE listing strategy...');
        const tx = await listingStrategyRegistry.registerListingStrategy(LISTING_STRATEGY.FIXED_PRICE, {
          controller: fixedPriceListingController.address,
        });
        console.log('tx: registerListingStrategy', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      // FIXED_PRICE_WITH_REWARD
      console.log('Deploying Fixed Price With Reward Listing Controller...');
      const fixedPriceWithRewardListingController = (await hre.run(
        'deploy:fixed-price-with-reward-listing-controller',
        {
          acl: aclContract.address,
          unsafe,
        },
      )) as FixedPriceWithRewardListingController;
      {
        console.log('Registering FIXED_PRICE_WITH_REWARD listing strategy...');
        const tx = await listingStrategyRegistry.registerListingStrategy(LISTING_STRATEGY.FIXED_PRICE_WITH_REWARD, {
          controller: fixedPriceWithRewardListingController.address,
        });
        console.log('tx: registerListingStrategy', tx.hash, tx.gasPrice?.toString());
        await tx.wait();
      }

      const deployments: Record<string, Contract> = {
        acl: aclContract,
        erc721Controller,
        erc721Vault,
        erc721presetConfigurable,
        assetClassRegistry,
        listingStrategyRegistry,
        warperPresetFactory,
        warperManager,
        universeRegistry,
        metahub,
        fixedPriceListingController,
        fixedPriceWithRewardListingController,
      };

      console.log();
      console.log('########################');
      console.log('# Deployment complete! #');
      console.log('########################');
      console.table(
        Object.entries(deployments).map(([name, contract]) => ({ name, address: contract.address })),
        ['name', 'address'],
      );
      console.log('########################');
      console.log();

      return deployments;
    },
  );
