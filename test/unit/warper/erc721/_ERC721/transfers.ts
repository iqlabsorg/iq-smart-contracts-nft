import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, BytesLike, ContractTransaction, Signer } from 'ethers';
import { Address } from 'hardhat-deploy/dist/types';
import {
  AssetClassRegistry,
  ERC721ReceiverMock,
  ERC721ReceiverMock__factory,
  IERC721Warper,
  IERC721WarperController,
  Metahub,
} from '../../../../../typechain';
import { ADDRESS_ZERO } from '../../../../shared/types';
import { ASSET_RENTAL_STATUS } from '../../../../shared/utils';

export function shouldBehaveTransfer(): void {
  describe('transfers', function () {
    let warper: IERC721Warper;
    let erc721WarperController: IERC721WarperController;
    let assetOwner: SignerWithAddress;
    let deployer: SignerWithAddress;

    let metahub: FakeContract<Metahub>;
    let assetClassRegistry: FakeContract<AssetClassRegistry>;
    let stranger: SignerWithAddress;

    const mintedTokenId = 445566;
    const nonExistentTokenId = 42;
    const ownerBalanceOriginal = BigNumber.from(1); // We only mint a single token at the start
    const RECEIVER_MAGIC_VALUE = '0x150b7a02';

    beforeEach(async function () {
      assetOwner = this.signers.named.assetOwner;
      deployer = this.signers.named.deployer;
      metahub = this.mocks.metahub;
      erc721WarperController = this.contracts.erc721WarperController;
      warper = this.contracts.erc721Warper;
      assetClassRegistry = this.mocks.assetClassRegistry;

      [, , stranger] = this.signers.unnamed;

      assetClassRegistry.assetClassConfig.returns({
        vault: ADDRESS_ZERO,
        controller: erc721WarperController.address,
      });

      // Mint
      await warper.connect(metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    // Reusable test case dependencies
    let transferTxBuilder: (
      as: Signer,
      from: string,
      to: string,
      tokenId: BigNumberish,
    ) => Promise<ContractTransaction>;
    let transferTx: ContractTransaction;
    let transferArgs: {
      toWhom: Address;
      tokenId: BigNumberish;
      data: BytesLike;
    };

    const transferWasSuccessful = function (): void {
      context('When rented', () => {
        beforeEach(() => {
          // NOTE: mocking the metahub return data
          metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.RENTED);
        });

        it('transfers the ownership of the given token ID', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.eventually.be.equal(transferArgs.toWhom);
        });
      });

      context('When available for renting', () => {
        beforeEach(() => {
          // NOTE: mocking the metahub return data
          metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.AVAILABLE);
        });

        it('does not change the ownership', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.eventually.be.equal(metahub.address);
        });
      });

      context('When not minted', () => {
        beforeEach(() => {
          // NOTE: mocking the metahub return data
          metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.NONE);
        });

        it('does not change the ownership', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.be.revertedWith(
            `OwnerQueryForNonexistentToken(${transferArgs.tokenId.toString()})`,
          );
        });
      });

      it('emits a Transfer event', async () => {
        await expect(transferTx)
          .to.emit(warper, 'Transfer')
          .withArgs(assetOwner.address, transferArgs.toWhom, transferArgs.tokenId);
      });

      //todo skipping while MetaHub does not have the rental transfers implemented
      it.skip('adjusts owners balances', async () => {
        let expectedBalance: BigNumber;
        // If sending to himself, balance does not change
        if (transferArgs.toWhom === assetOwner.address) {
          expectedBalance = ownerBalanceOriginal;
        } else {
          expectedBalance = ownerBalanceOriginal.sub('1');
        }
        await expect(warper.balanceOf(assetOwner.address)).to.eventually.equal(expectedBalance.toString());
      });
    };

    const shouldTransferTokensByUsers = (): void => {
      describe('When called by the owner', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, assetOwner.address, transferArgs.toWhom, transferArgs.tokenId),
          ).to.be.revertedWith('CallerIsNotMetahub()');
        });
      });

      describe('When called by the metahub', () => {
        beforeEach(async function () {
          transferTx = await transferTxBuilder(
            metahub.wallet,
            assetOwner.address,
            transferArgs.toWhom,
            transferArgs.tokenId,
          );
        });

        transferWasSuccessful();
      });

      context('When sent to the same owner by metahub', () => {
        beforeEach(async function () {
          transferTx = await transferTxBuilder(
            metahub.wallet,
            assetOwner.address,
            assetOwner.address,
            transferArgs.tokenId,
          );
          // eslint-disable-next-line require-atomic-updates
          transferArgs.toWhom = assetOwner.address; // Asset owner sending to himself
        });

        transferWasSuccessful();

        //todo skipping while MetaHub does not have the rental transfers implemented
        it.skip('keeps the owner balance', async () => {
          await expect(warper.balanceOf(assetOwner.address)).to.eventually.equal('1');
        });
      });

      context('When sent to the owner by owner', () => {
        it('reverts', async function () {
          transferArgs.toWhom = assetOwner.address; // Asset owner sending to himself

          await expect(
            transferTxBuilder(assetOwner, assetOwner.address, assetOwner.address, transferArgs.tokenId),
          ).to.be.revertedWith('CallerIsNotMetahub()');
        });
      });

      context('When the address of the previous owner is incorrect', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, stranger.address, stranger.address, transferArgs.tokenId),
          ).to.be.revertedWith(`CallerIsNotMetahub()`);
        });
      });

      context('When the given token ID does not exist', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(metahub.wallet, assetOwner.address, stranger.address, nonExistentTokenId),
          ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
        });
      });

      context('When the address to transfer the token to is the zero address', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(metahub.wallet, assetOwner.address, ADDRESS_ZERO, transferArgs.tokenId),
          ).to.be.revertedWith('TransferToTheZeroAddress');
        });
      });
    };

    const shouldTransferSafely = (): void => {
      describe('to a user account', () => {
        shouldTransferTokensByUsers();
      });

      describe('to a valid receiver contract', () => {
        let receiver: ERC721ReceiverMock;
        beforeEach(async () => {
          // NOTE: Not using `smock.mock`/`smock.fakes` because we need to emit
          //       events and `smock` can't do that just yet.
          receiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 0);
          transferArgs.toWhom = receiver.address;
        });
        shouldTransferTokensByUsers();

        it('calls onERC721Received', async () => {
          const tx = await transferTxBuilder(
            metahub.wallet,
            assetOwner.address,
            receiver.address,
            transferArgs.tokenId,
          );
          await expect(tx)
            .to.emit(receiver, 'Received')
            .withArgs(metahub.address, assetOwner.address, transferArgs.tokenId, transferArgs.data);
        });

        describe('with an invalid token id', () => {
          it('reverts', async () => {
            await expect(
              transferTxBuilder(assetOwner, assetOwner.address, receiver.address, nonExistentTokenId),
            ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
          });
        });
      });
    };

    context('When the address of the previous owner is incorrect', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(assetOwner).transferFrom(stranger.address, stranger.address, mintedTokenId),
        ).to.be.revertedWith(`CallerIsNotMetahub()`);
      });
    });

    context('When the sender is not authorized for the token id', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(stranger).transferFrom(stranger.address, stranger.address, mintedTokenId),
        ).to.be.revertedWith(`CallerIsNotMetahub()`);
      });
    });

    context('When the given token ID does not exist', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(metahub.wallet).transferFrom(assetOwner.address, stranger.address, nonExistentTokenId),
        ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
      });
    });

    context('When the address to transfer the token to is the zero address', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(metahub.wallet).transferFrom(assetOwner.address, ADDRESS_ZERO, mintedTokenId),
        ).to.be.revertedWith(`TransferToTheZeroAddress`);
      });
    });

    describe('via transferFrom', () => {
      beforeEach(function () {
        transferTxBuilder = async (as, from, to, tokenId) => warper.connect(as).transferFrom(from, to, tokenId);

        transferArgs = {
          toWhom: stranger.address,
          tokenId: mintedTokenId,
          data: '0x',
        };
      });

      shouldTransferTokensByUsers();
    });

    describe('via safeTransferFrom', () => {
      describe('with data', () => {
        const data = '0x42';
        beforeEach(function () {
          transferTxBuilder = async (as, from, to, tokenId) =>
            warper.connect(as)['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data);

          transferArgs = {
            toWhom: stranger.address,
            tokenId: mintedTokenId,
            data: data,
          };
        });

        shouldTransferSafely();
      });

      describe('without data', () => {
        const data = '0x';
        beforeEach(function () {
          transferTxBuilder = async (as, from, to, tokenId) =>
            warper.connect(as)['safeTransferFrom(address,address,uint256)'](from, to, tokenId);

          transferArgs = {
            toWhom: stranger.address,
            tokenId: mintedTokenId,
            data: data,
          };
        });

        shouldTransferSafely();
      });

      describe('to a receiver contract returning unexpected value', () => {
        it('reverts', async () => {
          const invalidReceiver = await new ERC721ReceiverMock__factory(deployer).deploy('0x000004a2', 0);

          await expect(
            warper
              .connect(metahub.wallet)
              ['safeTransferFrom(address,address,uint256)'](assetOwner.address, invalidReceiver.address, mintedTokenId),
          ).to.be.revertedWith(`TransferToNonERC721ReceiverImplementer("${invalidReceiver.address}")`);
        });
      });

      describe('to a receiver contract that reverts with message', () => {
        it('reverts', async () => {
          const invalidReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 1);
          await expect(
            warper
              .connect(metahub.wallet)
              ['safeTransferFrom(address,address,uint256)'](assetOwner.address, invalidReceiver.address, mintedTokenId),
          ).to.be.revertedWith('ERC721ReceiverMock: reverting');
        });
      });

      describe('to a receiver contract that reverts without message', () => {
        it('reverts', async () => {
          const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 2);
          await expect(
            warper
              .connect(metahub.wallet)
              ['safeTransferFrom(address,address,uint256)'](
                assetOwner.address,
                revertingReceiver.address,
                mintedTokenId,
              ),
          ).to.be.revertedWith(`TransferToNonERC721ReceiverImplementer("${revertingReceiver.address}")`);
        });
      });

      describe('to a receiver contract that panics', () => {
        it('reverts', async () => {
          const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 3);
          await expect(
            warper
              .connect(metahub.wallet)
              ['safeTransferFrom(address,address,uint256)'](
                assetOwner.address,
                revertingReceiver.address,
                mintedTokenId,
              ),
          ).to.be.revertedWith('panic code');
        });
      });

      describe('to a contract that does not implement the required function', () => {
        it('reverts', async () => {
          await expect(
            warper
              .connect(metahub.wallet)
              ['safeTransferFrom(address,address,uint256)'](assetOwner.address, warper.address, mintedTokenId),
          ).to.be.revertedWith(`TransferToNonERC721ReceiverImplementer("${warper.address}")`);
        });
      });
    });
  });
}
