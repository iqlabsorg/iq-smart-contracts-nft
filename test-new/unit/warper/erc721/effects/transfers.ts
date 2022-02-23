import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, BytesLike, ContractTransaction } from 'ethers';
import { Address } from 'hardhat-deploy/dist/types';
import { ERC721ReceiverMock, ERC721ReceiverMock__factory, ERC721Warper } from '../../../../../typechain';
import { AddressZero } from '../../../../shared/types';

export function shouldBehaveTransfer(): void {
  describe('transfers', function () {
    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let deployer: SignerWithAddress;

    let operator: SignerWithAddress;
    let stranger: SignerWithAddress;
    let approved: SignerWithAddress;

    const mintedTokenId = 445566;
    const nonExistentTokenId = 42;
    const ownerBalanceOriginal = BigNumber.from(1); // We only mint a single token at the start
    const RECEIVER_MAGIC_VALUE = '0x150b7a02';

    beforeEach(async function () {
      warper = this.contracts.presets.core;
      assetOwner = this.signers.named['assetOwner'];
      deployer = this.signers.named['deployer'];

      [approved, operator, stranger] = this.signers.unnamed;

      // Mint
      await warper.connect(this.mocks.metahub.wallet).safeMint(assetOwner.address, mintedTokenId);

      // Approve
      await warper.connect(assetOwner).approve(approved.address, mintedTokenId);
      await warper.connect(assetOwner).setApprovalForAll(operator.address, true);
    });

    // Reusable test case dependencies
    let transferTxBuilder: (
      as: SignerWithAddress,
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
      it('transfers the ownership of the given token ID to the given address', async () => {
        expect(await warper.ownerOf(transferArgs.tokenId)).to.be.equal(transferArgs.toWhom);
      });

      it('emits a Transfer event', async () => {
        await expect(transferTx)
          .to.emit(warper, 'Transfer')
          .withArgs(assetOwner.address, transferArgs.toWhom, transferArgs.tokenId);
      });

      it('clears the approval for the token ID', async () => {
        expect(await warper.getApproved(transferArgs.tokenId)).to.be.equal(AddressZero);
      });

      it('emits an Approval event', async () => {
        await expect(transferTx)
          .to.emit(warper, 'Approval')
          .withArgs(assetOwner.address, AddressZero, transferArgs.tokenId);
      });

      it('adjusts owners balances', async () => {
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
        beforeEach(async function () {
          transferTx = await transferTxBuilder(
            assetOwner,
            assetOwner.address,
            transferArgs.toWhom,
            transferArgs.tokenId,
          );
        });

        transferWasSuccessful();
      });

      context('when called by the approved individual', () => {
        beforeEach(async function () {
          transferTx = await transferTxBuilder(approved, assetOwner.address, transferArgs.toWhom, transferArgs.tokenId);
        });

        transferWasSuccessful();
      });

      context('when called by the operator', () => {
        beforeEach(async function () {
          transferTx = await transferTxBuilder(operator, assetOwner.address, transferArgs.toWhom, transferArgs.tokenId);
        });

        transferWasSuccessful();
      });

      context('when called by the owner without an approved user', () => {
        beforeEach(async function () {
          await warper.connect(assetOwner).approve(AddressZero, transferArgs.tokenId);

          transferTx = await transferTxBuilder(operator, assetOwner.address, transferArgs.toWhom, transferArgs.tokenId);
        });

        transferWasSuccessful();
      });

      context('when sent to the owner', () => {
        beforeEach(async function () {
          transferTx = await transferTxBuilder(
            assetOwner,
            assetOwner.address,
            assetOwner.address,
            transferArgs.tokenId,
          );
          transferArgs.toWhom = assetOwner.address; // Asset owner sending to himself
        });

        transferWasSuccessful();

        it('keeps ownership of the token', async () => {
          await expect(warper.ownerOf(transferArgs.tokenId)).to.eventually.equal(assetOwner.address);
        });

        it('clears the approval for the token ID', async () => {
          await expect(warper.getApproved(transferArgs.tokenId)).to.eventually.equal(AddressZero);
        });

        it('keeps the owner balance', async () => {
          await expect(warper.balanceOf(assetOwner.address)).to.eventually.equal('1');
        });

        // NOTE: This is a special test only for enumerable tokens
        // it('keeps same tokens by index', async () => {
        //   if (!this.token.tokenOfOwnerByIndex) return;
        //   const tokensListed = await Promise.all([0, 1].map(i => this.token.tokenOfOwnerByIndex(owner, i)));
        //   expect(tokensListed.map(t => t.toNumber())).to.have.members([firstTokenId.toNumber(), secondTokenId.toNumber()]);
        // });
      });

      context('when the address of the previous owner is incorrect', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, stranger.address, stranger.address, transferArgs.tokenId),
          ).to.be.revertedWith(`TransferOfTokenThatIsNotOwn(${transferArgs.tokenId})`);
        });
      });

      context('when the sender is not authorized for the token id', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(stranger, assetOwner.address, stranger.address, transferArgs.tokenId),
          ).to.be.revertedWith(`TransferCallerIsNotOwnerNorApproved("${stranger.address}")`);
        });
      });

      context('when the given token ID does not exist', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, assetOwner.address, stranger.address, nonExistentTokenId),
          ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
        });
      });

      context('when the address to transfer the token to is the zero address', () => {
        it('reverts', async () => {
          await expect(
            transferTxBuilder(assetOwner, assetOwner.address, AddressZero, transferArgs.tokenId),
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
          const tx = await transferTxBuilder(assetOwner, assetOwner.address, receiver.address, transferArgs.tokenId);
          await expect(tx)
            .to.emit(receiver, 'Received')
            .withArgs(assetOwner.address, assetOwner.address, transferArgs.tokenId, transferArgs.data);
        });

        it('calls onERC721Received from approved', async () => {
          const tx = await transferTxBuilder(approved, assetOwner.address, receiver.address, transferArgs.tokenId);
          await expect(tx)
            .to.emit(receiver, 'Received')
            .withArgs(approved.address, assetOwner.address, transferArgs.tokenId, transferArgs.data);
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
        ).to.be.revertedWith(`TransferOfTokenThatIsNotOwn(${mintedTokenId})`);
      });
    });

    context('when the sender is not authorized for the token id', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(stranger).transferFrom(stranger.address, stranger.address, mintedTokenId),
        ).to.be.revertedWith(`TransferCallerIsNotOwnerNorApproved("${stranger.address}")`);
      });
    });

    context('when the given token ID does not exist', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(assetOwner).transferFrom(assetOwner.address, stranger.address, nonExistentTokenId),
        ).to.be.revertedWith(`OperatorQueryForNonexistentToken(${nonExistentTokenId})`);
      });
    });

    context('when the address to transfer the token to is the zero address', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(assetOwner).transferFrom(assetOwner.address, AddressZero, mintedTokenId),
        ).to.be.revertedWith(`TransferToTheZeroAddress`);
      });
    });

    describe('via transferFrom', () => {
      beforeEach(function () {
        transferTxBuilder = (as, from, to, tokenId) =>
          warper.connect(assetOwner).connect(as).transferFrom(from, to, tokenId);

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
              .connect(assetOwner)
              ['safeTransferFrom(address,address,uint256)'](assetOwner.address, invalidReceiver.address, mintedTokenId),
          ).to.be.revertedWith(`TransferToNonERC721ReceiverImplementer("${invalidReceiver.address}")`);
        });
      });

      describe('to a receiver contract that reverts with message', () => {
        it('reverts', async () => {
          const invalidReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 1);
          await expect(
            warper
              .connect(assetOwner)
              ['safeTransferFrom(address,address,uint256)'](assetOwner.address, invalidReceiver.address, mintedTokenId),
          ).to.be.revertedWith('ERC721ReceiverMock: reverting');
        });
      });

      describe('to a receiver contract that reverts without message', () => {
        it('reverts', async () => {
          const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 2);
          await expect(
            warper
              .connect(assetOwner)
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
              .connect(assetOwner)
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
              .connect(assetOwner)
              ['safeTransferFrom(address,address,uint256)'](assetOwner.address, warper.address, mintedTokenId),
          ).to.be.revertedWith(`TransferToNonERC721ReceiverImplementer("${warper.address}")`);
        });
      });
    });
  });
}
