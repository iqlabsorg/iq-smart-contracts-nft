import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import {
  ERC721Mock,
  FixedPriceListingController,
  IAssetClassRegistry,
  IAssetController,
  IERC721AssetVault,
  IListingManager,
  IListingStrategyRegistry,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import {
  AssetClass,
  createUniverse,
  deployWarperPreset,
  ListingStrategy,
  makeERC721Asset,
  makeFixedPriceStrategy,
} from '../../../shared/utils';

const universeRegistrationParams = {
  name: 'IQ Universe',
  rentalFeePercent: 1000,
};

const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
  name: 'Warper',
  universeId: 1,
  paused: true,
};

export const warperPresetId = formatBytes32String('ERC721Basic');

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeListingManager(): void {
  describe('IListingManager', function () {
    let listingManager: IListingManager;
    let originalAsset: ERC721Mock;
    let metahub: IMetahub;
    let erc721assetVault: IERC721AssetVault;
    let assetClassRegistry: IAssetClassRegistry;
    let assetController: IAssetController;
    let universeRegistry: IUniverseRegistry;
    let warperPresetFactory: IWarperPresetFactory;
    let listingStrategyRegistry: IListingStrategyRegistry;
    let fixedPriceListingController: FixedPriceListingController;

    let nftCreator: SignerWithAddress;

    beforeEach(function () {
      ({
        listingManager,
        metahub,
        fixedPriceListingController,
        erc721assetVault,
        assetController,
        universeRegistry,
        assetClassRegistry,
        warperPresetFactory,
        listingStrategyRegistry,
      } = this.contracts);
      originalAsset = this.mocks.assets.erc721;

      nftCreator = this.signers.named.nftCreator;
    });

    describe('listAsset', () => {
      beforeEach(async () => {
        await originalAsset.connect(nftCreator).setApprovalForAll(metahub.address, true);
      });

      context('Asset class is supported', () => {
        beforeEach(async () => {
          await assetClassRegistry.registerAssetClass(AssetClass.ERC721, {
            controller: assetController.address,
            vault: erc721assetVault.address,
          });
        });

        context('Warper is registered', () => {
          let universeId: BigNumber;
          let warperAddress: string;

          beforeEach(async () => {
            universeId = await createUniverse(universeRegistry, universeRegistrationParams);
            warperAddress = await deployWarperPreset(
              warperPresetFactory,
              warperPresetId,
              metahub.address,
              originalAsset.address,
            );
            await metahub.registerWarper(warperAddress, { ...warperRegistrationParams, universeId });
          });

          context('Listing strategy is supported', () => {
            beforeEach(async () => {
              await listingStrategyRegistry.registerListingStrategy(ListingStrategy.FIXED_PRICE, {
                controller: fixedPriceListingController.address,
              });
            });

            it('lists the item successfully', async () => {
              // Test setup
              const asset = makeERC721Asset(originalAsset.address, 1);
              const params = makeFixedPriceStrategy(100);
              const maxLockPeriod = 86400;

              // Execute tx
              const tx = await listingManager.connect(nftCreator).listAsset(asset, params, maxLockPeriod, false);
              const receipt = await tx.wait();

              // Assert
              const events = await listingManager.queryFilter(
                listingManager.filters.AssetListed(),
                receipt.blockNumber,
              );
              const assetListed = events[0].args;
              await expect(tx).to.emit(listingManager, 'AssetListed');
              expect(assetListed).to.equalStruct({
                asset: asset,
                lister: nftCreator.address,
                listingId: BigNumber.from(1),
                maxLockPeriod: maxLockPeriod,
                params: params,
              });
              await expect(originalAsset.ownerOf(1)).to.eventually.equal(erc721assetVault.address);
            });
          });
        });
      });
    });

    describe('delistAsset', () => {
      // todo
    });

    describe('withdrawAsset', () => {
      // todo
    });

    describe('pauseListing', () => {
      // todo
    });

    describe('unpauseListing', () => {
      // todo
    });

    describe('listingInfo', () => {
      // todo
    });
  });
}
