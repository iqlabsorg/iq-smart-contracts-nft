import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
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
  IWarperController__factory,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { Rentings } from '../../../../typechain/IRentingManager';
import { AddressZero } from '../../../shared/types';
import {
  AssetClass,
  AssetListerHelper,
  createUniverse,
  deployWarperPreset,
  latestBlockTimestamp,
  ListingStrategy,
  makeERC721Asset,
  makeFixedPriceStrategy,
  waitBlockchainTime,
} from '../../../shared/utils';

const universeRegistrationParams = {
  name: 'IQ Universe',
  rentalFeePercent: 1000,
};

const emptyRentingAgreement: Rentings.AgreementStruct = {
  warpedAsset: {
    id: { class: '0x00000000', data: '0x' },
    value: BigNumber.from(0),
  },
  collectionId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  listingId: BigNumber.from(0),
  renter: AddressZero,
  startTime: 0,
  endTime: 0,
};

const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
  name: 'Warper',
  universeId: 1,
  paused: true,
};

export const warperPresetId = formatBytes32String('ERC721Basic');

const maxLockPeriod = 86400;
const baseRate = 100;
const tokenId = BigNumber.from(1);

const maxPaymentAmount = 100_000_000;

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

    let assetListerHelper: AssetListerHelper;

    let nftCreator: SignerWithAddress;
    let stranger: SignerWithAddress;

    let universeId: BigNumber;
    let listingId: BigNumber;
    let warperAddress: string;

    beforeEach(async function () {
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

      assetListerHelper = new AssetListerHelper(
        nftCreator,
        originalAsset,
        assetClassRegistry,
        assetController.address,
        erc721assetVault.address,
        listingManager,
        metahub,
        universeRegistry,
        warperPresetFactory,
        listingStrategyRegistry,
        fixedPriceListingController,
      );
      await assetListerHelper.setupRegistries();
      universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
    });

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
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);
      });

      context('Item is listed', () => {
        beforeEach(async () => {
          warperAddress = await assetListerHelper.setupWarper(universeId, warperRegistrationParams);
          listingId = await assetListerHelper.listAsset(maxLockPeriod, baseRate, tokenId);
        });

        context('Valid renting params', () => {
          context('Warper is not paused', () => {
            beforeEach(async () => {
              await metahub.unpauseWarper(warperAddress);
            });

            it('successfully rents an asset', async () => {
              const rentalParams = {
                listingId: listingId,
                paymentToken: paymentToken.address,
                rentalPeriod: 1000,
                renter: stranger.address,
                warper: warperAddress,
              };

              // Execute tx
              const rentalId = await rentingManager.connect(stranger).callStatic.rent(rentalParams, maxPaymentAmount);
              const tx = await rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount);

              // Assert
              await expect(tx).to.emit(rentingManager, 'AssetRented');

              const receipt = await tx.wait();
              const events = await rentingManager.queryFilter(
                rentingManager.filters.AssetRented(),
                receipt.blockNumber,
              );
              const assetRented = events[0].args;
              const blockTimestamp = await latestBlockTimestamp();
              const asset = makeERC721Asset(warperAddress, 1);
              expect(assetRented).to.equalStruct({
                rentalId: rentalId,
                renter: stranger.address,
                listingId: rentalParams.listingId,
                warpedAsset: asset,
                startTime: blockTimestamp,
                endTime: blockTimestamp + rentalParams.rentalPeriod,
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
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = await assetListerHelper.setupWarper(universeId, warperRegistrationParams);
        listingId = await assetListerHelper.listAsset(maxLockPeriod, baseRate, tokenId);
        await metahub.unpauseWarper(warperAddress);
      });

      context('Asset rented', () => {
        context('Multiple rental agreements already exist: idx [0],[1] are expired; [2] is active', () => {
          let rentalIds: Array<BigNumber>;
          let rentingParams: Rentings.ParamsStruct;
          beforeEach(async () => {
            rentingParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            // Create 3 existing rentals
            rentalIds = [];
            for (let index = 0; index < 3; index++) {
              await waitBlockchainTime(20000);
              rentalIds.push(await rentingManager.connect(stranger).callStatic.rent(rentingParams, maxPaymentAmount));
              await rentingManager.connect(stranger).rent(rentingParams, maxPaymentAmount);
            }
          });

          context('Accessing expired rental agreement (idx 0)', () => {
            it('returns a cleared data structure', async () => {
              await expect(rentingManager.rentalAgreementInfo(rentalIds[0])).to.eventually.equalStruct(
                emptyRentingAgreement,
              );
            });
          });

          context('Accessing expired rental agreement (idx 1)', () => {
            it('returns a cleared data structure', async () => {
              await expect(rentingManager.rentalAgreementInfo(rentalIds[1])).to.eventually.equalStruct(
                emptyRentingAgreement,
              );
            });
          });

          context('Accessing active rental agreement (idx 2)', () => {
            it('returns the rental agreement', async () => {
              const blockTimestamp = await latestBlockTimestamp();
              const assetStruct = makeERC721Asset(warperAddress, 1);
              const warperController = IWarperController__factory.connect(
                await metahub.warperController(warperAddress),
                metahub.signer,
              );
              const collectionId = await warperController.collectionId(assetStruct.id);
              const rentingAgreement: Rentings.AgreementStruct = {
                warpedAsset: makeERC721Asset(warperAddress, 1),
                collectionId: collectionId,
                listingId: listingId,
                renter: stranger.address,
                startTime: blockTimestamp,
                endTime: blockTimestamp + Number(rentingParams.rentalPeriod),
              };

              await expect(rentingManager.rentalAgreementInfo(rentalIds[2])).to.eventually.equalStruct(
                rentingAgreement,
              );
            });
          });
        });
      });
    });

    describe('userRentalAgreements', () => {
      // TODO
    });

    describe('userRentalCount', () => {
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = await assetListerHelper.setupWarper(universeId, warperRegistrationParams);
        listingId = await assetListerHelper.listAsset(maxLockPeriod, baseRate, tokenId);
        await metahub.unpauseWarper(warperAddress);
      });

      context('Multiple rental agreements already exist', () => {
        beforeEach(async () => {
          const rentalParams = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 1000,
            renter: stranger.address,
            warper: warperAddress,
          };

          // Create 3 existing rentals
          for (let index = 0; index < 3; index++) {
            await waitBlockchainTime(20000);
            await rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount);
          }
        });

        context('Latest rental agreement is expired', () => {
          beforeEach(async () => {
            await waitBlockchainTime(20000);
          });
          it('returns the rental agreement count (1)', async () => {
            await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(1);
          });
        });

        context('Latest rental agreement is active', () => {
          it('returns the rental agreement count (1)', async () => {
            await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(1);
          });
        });
      });
    });
  });
}
