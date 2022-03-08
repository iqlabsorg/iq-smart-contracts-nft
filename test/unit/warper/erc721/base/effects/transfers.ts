import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, BytesLike, ContractTransaction, Signer } from 'ethers';
import { Address } from 'hardhat-deploy/dist/types';
import { ERC721ReceiverMock, ERC721ReceiverMock__factory, ERC721Warper, Metahub } from '../../../../../../typechain';
import { AddressZero } from '../../../../../shared/types';
import { WarperRentalStatus } from '../../../../../shared/utils';

export function shouldBehaveTransfer(): void {
  describe('transfers', function () {
    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let deployer: SignerWithAddress;

    let metahub: FakeContract<Metahub>;
    let operator: SignerWithAddress;
    let stranger: SignerWithAddress;
    let approved: SignerWithAddress;

    const mintedTokenId = 445566;
    const nonExistentTokenId = 42;
    const ownerBalanceOriginal = BigNumber.from(1); // We only mint a single token at the start
    const RECEIVER_MAGIC_VALUE = '0x150b7a02';

    beforeEach(async function () {
      metahub = this.mocks.metahub;
      warper = this.contracts.erc721Warper;
      assetOwner = this.signers.named['assetOwner'];
      deployer = this.signers.named['deployer'];

      [approved, operator, stranger] = this.signers.unnamed;

      // Mint
      await warper.connect(this.mocks.metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
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

    const transferWasSuccessful = function () {
      context('when rented', () => {
        beforeEach(() => {
          // NOTE: mocking the metahub return data
          metahub.getWarperRentalStatus.returns(WarperRentalStatus.RENTED);
        });

        it('transfers the ownership of the given token ID', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.eventually.be.equal(transferArgs.toWhom);
        });
      });

      context('when minted (but not rented)', () => {
        beforeEach(() => {
          // NOTE: mocking the metahub return data
          metahub.getWarperRentalStatus.returns(WarperRentalStatus.MINTED);
        });

        it('does not change the ownership', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.eventually.be.equal(metahub.address);
        });
      });

      context('when not minted', () => {
        beforeEach(() => {
          // NOTE: mocking the metahub return data
          metahub.getWarperRentalStatus.returns(WarperRentalStatus.NOT_MINTED);
        });

        it('does not change the ownership', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.be.revertedWith(
            `OwnerQueryForNonexistentToken(${transferArgs.tokenId})`,
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
        if (transferArgs.toWhom == assetOwner.address) {
          expectedBalance = ownerBalanceOriginal;
        } else {
          expectedBalance = ownerBalanceOriginal.sub('1');
        }
        await expect(warper.balanceOf(assetOwner.address)).to.eventually.equal(expectedBalance.toString());
      });
    };

    const shouldTransferTokensByUsers = function () {
      describe('when called by the owner', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, assetOwner.address, transferArgs.toWhom, transferArgs.tokenId),
          ).to.be.revertedWith('CallerIsNotMetahub()');
        });
      });

      describe('when called by the metahub', () => {
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

      context('when sent to the same owner by metahub', () => {
        beforeEach(async function () {
          transferTx = await transferTxBuilder(
            metahub.wallet,
            assetOwner.address,
            assetOwner.address,
            transferArgs.tokenId,
          );
          transferArgs.toWhom = assetOwner.address; // Asset owner sending to himself
        });

        transferWasSuccessful();

        //todo skipping while MetaHub does not have the rental transfers implemented
        it.skip('keeps the owner balance', async () => {
          await expect(warper.balanceOf(assetOwner.address)).to.eventually.equal('1');
        });
      });

      context('when sent to the owner by owner', () => {
        it('reverts', async function () {
          transferArgs.toWhom = assetOwner.address; // Asset owner sending to himself

          await expect(
            transferTxBuilder(assetOwner, assetOwner.address, assetOwner.address, transferArgs.tokenId),
          ).to.be.revertedWith('CallerIsNotMetahub()');
        });
      });

      context('when the address of the previous owner is incorrect', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, stranger.address, stranger.address, transferArgs.tokenId),
          ).to.be.revertedWith(`CallerIsNotMetahub()`);
        });
      });

      context('when the given token ID does not exist', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(metahub.wallet, assetOwner.address, stranger.address, nonExistentTokenId),
          ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
        });
      });

      context('when the address to transfer the token to is the zero address', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(metahub.wallet, assetOwner.address, AddressZero, transferArgs.tokenId),
          ).to.be.revertedWith('TransferToTheZeroAddress');
        });
      });
    };

    const shouldTransferSafely = function () {
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

    context('when the address of the previous owner is incorrect', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(assetOwner).transferFrom(stranger.address, stranger.address, mintedTokenId),
        ).to.be.revertedWith(`CallerIsNotMetahub()`);
      });
    });

    context('when the sender is not authorized for the token id', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(stranger).transferFrom(stranger.address, stranger.address, mintedTokenId),
        ).to.be.revertedWith(`CallerIsNotMetahub()`);
      });
    });

    context('when the given token ID does not exist', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(metahub.wallet).transferFrom(assetOwner.address, stranger.address, nonExistentTokenId),
        ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
      });
    });

    context('when the address to transfer the token to is the zero address', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(metahub.wallet).transferFrom(assetOwner.address, AddressZero, mintedTokenId),
        ).to.be.revertedWith(`TransferToTheZeroAddress`);
      });
    });

    describe('via transferFrom', () => {
      beforeEach(function () {
        transferTxBuilder = (as, from, to, tokenId) => warper.connect(as).transferFrom(from, to, tokenId);

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
          transferTxBuilder = (as, from, to, tokenId) =>
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
          transferTxBuilder = (as, from, to, tokenId) =>
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
