import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import {
  ERC20Mock,
  ERC721Mock,
  FixedPriceListingController,
  IAssetClassRegistry,
  IAssetController,
  IERC721AssetVault,
  IListingManager,
  IListingStrategyRegistry,
  IMetahub,
  IRentingManager,
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
 * The metahub contract behaves like IRentingManager
 */
export function shouldBehaveLikeRentingManager(): void {
  describe('IRentingManager', function () {
    let rentingManager: IRentingManager;
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
    let paymentToken: ERC20Mock;

    let nftCreator: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      ({
        rentingManager,
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
      paymentToken = this.mocks.assets.erc20;

      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;
    });

    let listingId: BigNumber;
    let warperAddress: string;

    async function listAsset() {
      await originalAsset.connect(nftCreator).setApprovalForAll(metahub.address, true);
      await assetClassRegistry.registerAssetClass(AssetClass.ERC721, {
        controller: assetController.address,
        vault: erc721assetVault.address,
      });

      const universeId = await createUniverse(universeRegistry, universeRegistrationParams);
      warperAddress = await deployWarperPreset(
        warperPresetFactory,
        warperPresetId,
        metahub.address,
        originalAsset.address,
      );
      await metahub.registerWarper(warperAddress, { ...warperRegistrationParams, universeId });
      await listingStrategyRegistry.registerListingStrategy(ListingStrategy.FIXED_PRICE, {
        controller: fixedPriceListingController.address,
      });
      const asset = makeERC721Asset(originalAsset.address, 1);
      const params = makeFixedPriceStrategy(100);
      const maxLockPeriod = 86400;
      listingId = await listingManager.connect(nftCreator).callStatic.listAsset(asset, params, maxLockPeriod, false);
      await listingManager.connect(nftCreator).listAsset(asset, params, maxLockPeriod, false);
    }

    describe('collectionRentedValue', () => {
      // TODO
    });

    describe('assetRentalStatus', () => {
      // TODO
    });

    describe('estimateRent', () => {
      // TODO
    });

    describe('rent', () => {
      context('Item is listed', () => {
        beforeEach(async () => {
          await listAsset();
        });

        context('Valid renting params', () => {
          context('Warper is not paused', () => {
            beforeEach(async () => {
              await metahub.unpauseWarper(warperAddress);
            });

            it('successfully rents an asset', async () => {
              const maxPaymentAmount = 100_000_000;
              await paymentToken.mint(stranger.address, maxPaymentAmount);
              await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);
              await rentingManager.connect(stranger).rent(
                {
                  listingId: listingId,
                  paymentToken: paymentToken.address,
                  rentalPeriod: 1000,
                  renter: stranger.address,
                  warper: warperAddress,
                },
                maxPaymentAmount,
              );
              // TODO Emits an event
            });

            context('Asset rented', () => {
              it('updates the owner of the warped asset to the renter');

              it('creates a rental agreement');

              context('Rental agreements already exist', () => {
                it('clears 2 existing rental agreements');
              });
            });
          });
        });
      });

      context('Item already rented', () => {
        it('reverts');
      });
    });

    describe('rentalAgreementInfo', () => {
      // TODO
    });

    describe('userRentalCount', () => {
      // TODO
    });

    describe('userRentalAgreements', () => {
      // TODO
    });
  });
}
