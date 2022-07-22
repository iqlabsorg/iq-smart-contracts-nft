import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { makeERC721Asset } from '../../../../src';
import {
  ERC20Mock,
  ERC721Mock,
  IAssetClassRegistry,
  IERC721AssetVault,
  IListingManager,
  IMetahub,
  IPaymentManager,
  IUniverseRegistry,
  IWarperController__factory,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { Rentings } from '../../../../typechain/contracts/metahub/IMetahub';
import { ADDRESS_ZERO } from '../../../shared/types';
import {
  AccessControlledHelper,
  AssetRegistryHelper,
  ListingHelper,
  UniverseHelper,
  WarperHelper,
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
    let universeRegistry: IUniverseRegistry;
    let warperPresetFactory: IWarperPresetFactory;
    let warperManager: IWarperManager;
    let paymentToken: ERC20Mock;

    let assetListerHelper: ListingHelper;
    let warperHelper: WarperHelper;

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
        erc721assetVault,
        universeRegistry,
        assetClassRegistry,
        warperPresetFactory,
        warperManager,
      } = this.contracts);

      originalAsset = this.mocks.assets.erc721;
      paymentToken = this.mocks.assets.erc20;

      admin = this.signers.named.admin;
      universeOwner = this.signers.named.universeOwner;
      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;

      // Create a warper, create a listing, rent the listing.

      // Instantiate the universe and the warpers
      await new AssetRegistryHelper(assetClassRegistry)
        .withERC721ClassConfig(erc721assetVault, this.contracts.erc721WarperController)
        .registerAssetClasses();
      ({ universeId } = await new UniverseHelper(universeRegistry.connect(universeOwner)).create(
        universeRegistrationParams,
      ));
      warperHelper = new WarperHelper(
        warperPresetFactory,
        metahub,
        warperManager.connect(universeOwner),
      ).withConfigurableWarperPreset();

      // Prepare listing helper
      assetListerHelper = new ListingHelper(listingManager)
        .withERC721Asset(originalAsset.address, tokenId)
        .withFixedPriceListingStrategy(baseRate)
        .withImmediatePayout(false)
        .withMaxLockPeriod(maxLockPeriod)
        .withLister(nftCreator);

      warperAddress = (await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId }))
        .address;
      await warperManager.connect(universeOwner).unpauseWarper(warperAddress);

      ({ listingId } = await assetListerHelper.listAsset());

      const warperController = IWarperController__factory.connect(
        await warperManager.warperController(warperAddress),
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
