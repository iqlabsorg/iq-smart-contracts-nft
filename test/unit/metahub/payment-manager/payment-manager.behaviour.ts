// TODO make sure to read events over from the rent() method!

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
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
import { AccessControlledHelper, AssetListerHelper, makeERC721Asset } from '../../../shared/utils';

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

    let nftCreator: SignerWithAddress;
    let admin: SignerWithAddress;
    let stranger: SignerWithAddress;

    let universeId: BigNumber;
    let listingId: BigNumber;
    let warperAddress: string;

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
      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;

      // Create a warper, create a listing, rent the listing.
      assetListerHelper = new AssetListerHelper(
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
      warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
      await metahub.unpauseWarper(warperAddress);
      listingId = await assetListerHelper.listAsset(nftCreator, originalAsset, maxLockPeriod, baseRate, tokenId, false);

      const warperController = IWarperController__factory.connect(
        await metahub.warperController(warperAddress),
        metahub.signer,
      );
      const assetStruct = makeERC721Asset(warperAddress, tokenId);
      await warperController.collectionId(assetStruct.id);
      const rentingParams1 = {
        listingId: listingId,
        paymentToken: paymentToken.address,
        rentalPeriod: 100,
        renter: stranger.address,
        warper: warperAddress,
      };

      await paymentToken.mint(stranger.address, maxPaymentAmount);
      await paymentToken.connect(stranger).approve(metahub.address, maxPaymentAmount);

      await metahub.connect(stranger).rent(rentingParams1, maxPaymentAmount);
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
      it('todo');
    });
    describe('withdrawFunds', () => {
      it('todo');
    });
    describe('protocolBalance', () => {
      it('todo');
    });
    describe('protocolBalances', () => {
      it('todo');
    });
    describe('universeBalance', () => {
      it('todo');
    });
    describe('universeBalances', () => {
      it('todo');
    });
    describe('balance', () => {
      it('todo');
    });
    describe('balances', () => {
      it('todo');
    });
  });
}
