import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { makeERC721Asset } from '../../../../src';
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
  IPaymentManager,
  IUniverseRegistry,
  IWarperController__factory,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { Rentings } from '../../../../typechain/contracts/metahub/IMetahub';
import { ADDRESS_ZERO } from '../../../shared/types';
import { AccessControlledHelper, AssetListerHelper } from '../../../shared/utils';

const universeRegistrationParams = {
  name: 'IQ Universe',
  rentalFeePercent: 1000,
};

const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
  name: 'Warper',
  universeId: 1,
  paused: true,
};

const maxLockPeriod = 86400;
const baseRate = 100;
const tokenId = BigNumber.from(1);

const maxPaymentAmount = 100_000_000;

/**
 * The metahub contract behaves like IPaymentManager
 */
export function shouldBehaveLikePaymentManager(): void {
  describe('IPaymentManager', function (): void {
    let paymentManager: IPaymentManager;
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

    let universeOwner: SignerWithAddress;
    let nftCreator: SignerWithAddress;
    let admin: SignerWithAddress;
    let stranger: SignerWithAddress;

    let universeId: BigNumber;
    let listingId: BigNumber;
    let warperAddress: string;

    let rentalParams: Rentings.ParamsStruct;
    let rentCost: Rentings.RentalFeesStructOutput;

    beforeEach(async function () {
      ({
        paymentManager,
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

      admin = this.signers.named.admin;
      universeOwner = this.signers.named.universeOwner;
      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;

      // Create a warper, create a listing, rent the listing.
      assetListerHelper = new AssetListerHelper(
        assetClassRegistry,
        assetController.address,
        erc721assetVault.address,
        listingManager,
        metahub.connect(universeOwner),
        universeRegistry.connect(universeOwner),
        warperPresetFactory,
        listingStrategyRegistry,
        fixedPriceListingController,
      );
      await assetListerHelper.setupRegistries();

      universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
      warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
      await metahub.connect(universeOwner).unpauseWarper(warperAddress);
      listingId = await assetListerHelper.listAsset(nftCreator, originalAsset, maxLockPeriod, baseRate, tokenId, false);

      const warperController = IWarperController__factory.connect(
        await metahub.warperController(warperAddress),
        metahub.signer,
      );
      const assetStruct = makeERC721Asset(warperAddress, tokenId);
      await warperController.collectionId(assetStruct.id);
      rentalParams = {
        listingId: listingId,
        paymentToken: paymentToken.address,
        rentalPeriod: 100,
        renter: stranger.address,
        warper: warperAddress,
      };

      await paymentToken.mint(stranger.address, maxPaymentAmount);
      await paymentToken.connect(stranger).approve(metahub.address, maxPaymentAmount);

      rentCost = await metahub.connect(stranger).estimateRent(rentalParams);
      await metahub.connect(stranger).rent(rentalParams, maxPaymentAmount);
    });

    describe('withdrawProtocolFunds', () => {
      context('When `amount` is 0', () => {
        it('reverts', async () => {
          const amount = 0;

          await expect(
            paymentManager.connect(admin).withdrawProtocolFunds(paymentToken.address, amount, stranger.address),
          ).to.be.revertedWith(`InvalidWithdrawalAmount(${amount})`);
        });
      });

      context('When `amount` is larger than the current balance', () => {
        it('reverts', async () => {
          const protocolBalance = await paymentManager.protocolBalance(paymentToken.address);
          const amount = protocolBalance.add(1);

          await expect(
            paymentManager.connect(admin).withdrawProtocolFunds(paymentToken.address, amount, stranger.address),
          ).to.be.revertedWith(`InsufficientBalance(${protocolBalance.toString()})`);
        });
      });

      context('When `amount` is equal to the current balance', () => {
        AccessControlledHelper.onlyAdminCan(async signer => {
          const protocolBalance = await paymentManager.protocolBalance(paymentToken.address);
          const amount = protocolBalance;

          await expect(
            paymentManager.connect(signer).withdrawProtocolFunds(paymentToken.address, amount, stranger.address),
          )
            .to.emit(paymentToken, 'Transfer')
            .withArgs(paymentManager.address, stranger.address, amount);
          await expect(paymentManager.protocolBalance(paymentToken.address)).to.eventually.equal(0);
        });
      });

      context('When `amount` is less than the current balance', () => {
        AccessControlledHelper.onlyAdminCan(async signer => {
          const protocolBalance = await paymentManager.protocolBalance(paymentToken.address);
          const amount = protocolBalance.sub(1);

          await expect(
            paymentManager.connect(signer).withdrawProtocolFunds(paymentToken.address, amount, stranger.address),
          )
            .to.emit(paymentToken, 'Transfer')
            .withArgs(paymentManager.address, stranger.address, amount);
          await expect(paymentManager.protocolBalance(paymentToken.address)).to.eventually.equal(1);
        });
      });
    });

    describe('withdrawUniverseFunds', () => {
      context('When `amount` is 0', () => {
        it('reverts', async () => {
          const amount = 0;

          await expect(
            paymentManager
              .connect(universeOwner)
              .withdrawUniverseFunds(universeId, paymentToken.address, amount, stranger.address),
          ).to.be.revertedWith(`InvalidWithdrawalAmount(${amount})`);
        });
      });

      context('When `amount` is larger than the current balance', () => {
        it('reverts', async () => {
          const universeBalance = await paymentManager.universeBalance(universeId, paymentToken.address);
          const amount = universeBalance.add(1);

          await expect(
            paymentManager
              .connect(universeOwner)
              .withdrawUniverseFunds(universeId, paymentToken.address, amount, stranger.address),
          ).to.be.revertedWith(`InsufficientBalance(${universeBalance.toString()})`);
        });
      });

      context('When `amount` is equal to the current balance', () => {
        AccessControlledHelper.onlyUniverseOwnerCan(async signer => {
          const universeBalance = await paymentManager.universeBalance(universeId, paymentToken.address);
          const amount = universeBalance;

          await expect(
            paymentManager
              .connect(signer)
              .withdrawUniverseFunds(universeId, paymentToken.address, amount, stranger.address),
          )
            .to.emit(paymentToken, 'Transfer')
            .withArgs(paymentManager.address, stranger.address, amount);
          await expect(paymentManager.universeBalance(universeId, paymentToken.address)).to.eventually.equal(0);
        });
      });

      context('When `amount` is less than the current balance', () => {
        AccessControlledHelper.onlyUniverseOwnerCan(async signer => {
          const universeBalance = await paymentManager.universeBalance(universeId, paymentToken.address);
          const amount = universeBalance.sub(1);

          await expect(
            paymentManager
              .connect(signer)
              .withdrawUniverseFunds(universeId, paymentToken.address, amount, stranger.address),
          )
            .to.emit(paymentToken, 'Transfer')
            .withArgs(paymentManager.address, stranger.address, amount);
          await expect(paymentManager.universeBalance(universeId, paymentToken.address)).to.eventually.equal(1);
        });
      });
    });

    describe('withdrawFunds', () => {
      context('When `amount` is 0', () => {
        it('reverts', async () => {
          const amount = 0;

          await expect(
            paymentManager.connect(nftCreator).withdrawFunds(paymentToken.address, amount, stranger.address),
          ).to.be.revertedWith(`InvalidWithdrawalAmount(${amount})`);
        });
      });

      context('When `amount` is larger than the current balance', () => {
        it('reverts', async () => {
          const listersBalance = await paymentManager.balance(nftCreator.address, paymentToken.address);
          const amount = listersBalance.add(1);

          await expect(
            paymentManager.connect(nftCreator).withdrawFunds(paymentToken.address, amount, stranger.address),
          ).to.be.revertedWith(`InsufficientBalance(${listersBalance.toString()})`);
        });
      });

      context('When `amount` is equal to the current balance', () => {
        it('withdraws successfully', async () => {
          const listersBalance = await paymentManager.balance(nftCreator.address, paymentToken.address);
          const amount = listersBalance;

          await expect(paymentManager.connect(nftCreator).withdrawFunds(paymentToken.address, amount, stranger.address))
            .to.emit(paymentToken, 'Transfer')
            .withArgs(paymentManager.address, stranger.address, amount);
          await expect(paymentManager.balance(nftCreator.address, paymentToken.address)).to.eventually.equal(0);
        });
      });

      context('When `amount` is less than the current balance', () => {
        it('withdraws successfully', async () => {
          const listersBalance = await paymentManager.balance(nftCreator.address, paymentToken.address);
          const amount = listersBalance.sub(1);

          await expect(paymentManager.connect(nftCreator).withdrawFunds(paymentToken.address, amount, stranger.address))
            .to.emit(paymentToken, 'Transfer')
            .withArgs(paymentManager.address, stranger.address, amount);
          await expect(paymentManager.balance(nftCreator.address, paymentToken.address)).to.eventually.equal(1);
        });
      });
    });

    describe('protocolBalance', () => {
      context('When payment token passed supplied', () => {
        it('returns balance', async () => {
          await expect(paymentManager.protocolBalance(paymentToken.address)).to.eventually.equal(rentCost.protocolFee);
        });
      });

      context('When a non-payment token supplied', () => {
        it('returns 0', async () => {
          await expect(paymentManager.protocolBalance(ADDRESS_ZERO)).to.eventually.equal(0);
        });
      });
    });

    describe('protocolBalances', () => {
      it('returns balance info', async () => {
        await expect(paymentManager.protocolBalances()).to.eventually.containsAllStructs([
          {
            token: paymentToken.address,
            amount: rentCost.protocolFee,
          },
        ]);
      });
    });

    describe('universeBalance', () => {
      it('returns balance info', async () => {
        await expect(paymentManager.universeBalance(universeId, paymentToken.address)).to.eventually.equal(
          rentCost.universeBaseFee.add(rentCost.universePremium),
        );
      });
    });

    describe('universeBalances', () => {
      it('returns balance info', async () => {
        await expect(paymentManager.universeBalances(universeId)).to.eventually.containsAllStructs([
          {
            token: paymentToken.address,
            amount: rentCost.universeBaseFee.add(rentCost.universePremium),
          },
        ]);
      });
    });

    describe('balance', () => {
      it('returns balance info', async () => {
        await expect(paymentManager.balance(nftCreator.address, paymentToken.address)).to.eventually.equal(
          rentCost.listerPremium.add(rentCost.listerBaseFee),
        );
      });
    });
    describe('balances', () => {
      it('returns balance info', async () => {
        await expect(paymentManager.balances(nftCreator.address)).to.eventually.containsAllStructs([
          {
            token: paymentToken.address,
            amount: rentCost.listerPremium.add(rentCost.listerBaseFee),
          },
        ]);
      });
    });
  });
}
