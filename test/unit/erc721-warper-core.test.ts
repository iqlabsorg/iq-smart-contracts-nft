import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';
import {
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Warper,
  ERC721WarperMock,
  ERC721WarperMock__factory,
  ERC721Warper__factory,
  ERC721ReceiverMock,
  Metahub,
  Metahub__factory,
  ERC721ReceiverMock__factory,
} from '../../typechain';
import { BaseContract, BigNumber, BigNumberish, BytesLike, ContractTransaction, Signer } from 'ethers';
import { Address } from 'hardhat-deploy/dist/types';

const { AddressZero } = ethers.constants;
const { defaultAbiCoder } = ethers.utils;

const nonExistentTokenId = 42;

const transferWasSuccessful = ({
  tokenOwner,
  token,
  transaction,
  tokenId,
  toWhom,
}: {
  token: () => ERC721WarperMock;
  transaction: () => Promise<ContractTransaction>;
  tokenOwner: () => SignerWithAddress;
  toWhom: () => Address;
  tokenId: BigNumberish;
}) => {
  let tx: ContractTransaction;
  let ownerBalanceBefore: BigNumber;
  beforeEach(async () => {
    ownerBalanceBefore = await token().balanceOf(tokenOwner().address);
    tx = await transaction();
  });

  it('transfers the ownership of the given token ID to the given address', async () => {
    expect(await token().ownerOf(tokenId)).to.be.equal(toWhom());
  });

  it('emits a Transfer event', async () => {
    await expect(tx).to.emit(token(), 'Transfer').withArgs(tokenOwner().address, toWhom(), tokenId);
  });

  it('clears the approval for the token ID', async () => {
    expect(await token().getApproved(tokenId)).to.be.equal(AddressZero);
  });

  it('emits an Approval event', async () => {
    await expect(tx).to.emit(token(), 'Approval').withArgs(tokenOwner().address, AddressZero, tokenId);
  });

  it('adjusts owners balances', async () => {
    let expectedBalance: BigNumber;
    // If sending to himself, balance does not change
    if (toWhom() == tokenOwner().address) {
      expectedBalance = ownerBalanceBefore;
    } else {
      expectedBalance = ownerBalanceBefore.sub('1');
    }
    expect(await token().balanceOf(tokenOwner().address)).to.equal(expectedBalance.toString());
  });
};

const shouldTransferTokensByUsers = ({
  token,
  tokenOwner,
  toWhom,
  tokenId,
  transaction,
  approved,
  operator,
  stranger,
}: {
  token: () => ERC721WarperMock;
  transaction: (as: SignerWithAddress, from: string, to: string, tokenId: BigNumberish) => Promise<ContractTransaction>;
  tokenId: BigNumberish;
  tokenOwner: () => SignerWithAddress;
  toWhom: () => Address;
  approved: () => SignerWithAddress;
  operator: () => SignerWithAddress;
  stranger: () => SignerWithAddress;
}) => {
  describe('when called by the owner', () => {
    transferWasSuccessful({
      token,
      transaction: () => transaction(tokenOwner(), tokenOwner().address, toWhom(), tokenId),
      tokenId,
      tokenOwner: tokenOwner,
      toWhom: toWhom,
    });
  });

  context('when called by the approved individual', () => {
    transferWasSuccessful({
      token,
      transaction: () => transaction(approved(), tokenOwner().address, toWhom(), tokenId),
      tokenId,
      tokenOwner: tokenOwner,
      toWhom: toWhom,
    });
  });

  context('when called by the operator', () => {
    transferWasSuccessful({
      token,
      transaction: () => transaction(operator(), tokenOwner().address, toWhom(), tokenId),
      tokenId,
      tokenOwner: tokenOwner,
      toWhom: toWhom,
    });
  });

  context('when called by the owner without an approved user', () => {
    beforeEach(async () => {
      await token().connect(tokenOwner()).approve(AddressZero, tokenId);
    });

    transferWasSuccessful({
      token,
      transaction: () => transaction(operator(), tokenOwner().address, toWhom(), tokenId),
      tokenId,
      tokenOwner: tokenOwner,
      toWhom: toWhom,
    });
  });

  context('when sent to the owner', () => {
    transferWasSuccessful({
      token,
      transaction: () => transaction(tokenOwner(), tokenOwner().address, tokenOwner().address, tokenId),
      tokenId,
      tokenOwner: tokenOwner,
      toWhom: () => tokenOwner().address,
    });

    it('keeps ownership of the token', async () => {
      await expect(token().ownerOf(tokenId)).to.eventually.equal(tokenOwner().address);
    });

    it('clears the approval for the token ID', async () => {
      await expect(token().getApproved(tokenId)).to.eventually.equal(AddressZero);
    });

    it('keeps the owner balance', async () => {
      await expect(token().balanceOf(tokenOwner().address)).to.eventually.equal('2');
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
      await expect(transaction(tokenOwner(), stranger().address, stranger().address, tokenId)).to.be.revertedWithError(
        'TransferOfTokenThatIsNotOwn',
        tokenId,
      );
    });
  });

  context('when the sender is not authorized for the token id', () => {
    it('reverts', async () => {
      await expect(transaction(stranger(), tokenOwner().address, stranger().address, tokenId)).to.be.revertedWithError(
        'TransferCallerIsNotOwnerNorApproved',
        stranger().address,
      );
    });
  });

  context('when the given token ID does not exist', () => {
    it('reverts', async () => {
      await expect(
        transaction(tokenOwner(), tokenOwner().address, stranger().address, nonExistentTokenId),
      ).to.be.revertedWithError('OperatorQueryForNonexistentToken', nonExistentTokenId);
    });
  });

  context('when the address to transfer the token to is the zero address', () => {
    it('reverts', async () => {
      await expect(transaction(tokenOwner(), tokenOwner().address, AddressZero, tokenId)).to.be.revertedWithError(
        'TransferToTheZeroAddress',
      );
    });
  });
};

const itClearsApproval = ({ token, tokenId }: { token: () => ERC721WarperMock; tokenId: BigNumberish }) => {
  it('clears approval for the token', async () => {
    await expect(token().getApproved(tokenId)).to.eventually.equal(AddressZero);
  });
};

const itApproves = ({
  token,
  tokenId,
  address,
}: {
  token: () => ERC721WarperMock;
  tokenId: BigNumberish;
  address: () => Address;
}) => {
  it('sets the approval for the target address', async () => {
    await expect(token().getApproved(tokenId)).to.eventually.equal(address());
  });
};

const itEmitsApprovalEvent = ({
  token,
  transaction,
  tokenId,
  owner,
  approved,
}: {
  token: () => ERC721WarperMock;
  transaction: () => ContractTransaction;
  tokenId: BigNumberish;
  owner: () => Address;
  approved: () => Address;
}) => {
  it('emits an approval event', () => {
    expect(transaction()).to.emit(token(), 'Approval').withArgs(owner(), approved(), tokenId);
  });
};

const RECEIVER_MAGIC_VALUE = '0x150b7a02';

const shouldTransferSafely = ({
  token,
  tokenOwner,
  toWhom,
  tokenId,
  transaction,
  approved,
  operator,
  stranger,
  data,
}: {
  token: () => ERC721WarperMock;
  transaction: (as: SignerWithAddress, from: string, to: string, tokenId: BigNumberish) => Promise<ContractTransaction>;
  tokenId: BigNumberish;
  tokenOwner: () => SignerWithAddress;
  toWhom: () => Address;
  approved: () => SignerWithAddress;
  operator: () => SignerWithAddress;
  stranger: () => SignerWithAddress;
  data: BytesLike;
}) => {
  describe('to a user account', () => {
    shouldTransferTokensByUsers({ token, tokenOwner, toWhom, tokenId, transaction, approved, operator, stranger });
  });

  describe('to a valid receiver contract', () => {
    let receiver: ERC721ReceiverMock;
    beforeEach(async () => {
      // NOTE: Not using `smock.mock`/`smock.fakes` because we need to emit
      //       events and `smock` can't do that just yet.
      receiver = await new ERC721ReceiverMock__factory(tokenOwner()).deploy(RECEIVER_MAGIC_VALUE, 0);
    });
    shouldTransferTokensByUsers({
      token,
      tokenOwner,
      toWhom: () => receiver.address,
      tokenId,
      transaction,
      approved,
      operator,
      stranger,
    });

    it('calls onERC721Received', async () => {
      const tx = await transaction(tokenOwner(), tokenOwner().address, receiver.address, tokenId);
      await expect(tx)
        .to.emit(receiver, 'Received')
        .withArgs(tokenOwner().address, tokenOwner().address, tokenId, data);
    });

    it('calls onERC721Received from approved', async () => {
      const tx = await transaction(approved(), tokenOwner().address, receiver.address, tokenId);
      await expect(tx).to.emit(receiver, 'Received').withArgs(approved().address, tokenOwner().address, tokenId, data);
    });

    describe('with an invalid token id', () => {
      it('reverts', async () => {
        const nonExistentTokenId = 42;
        await expect(
          transaction(tokenOwner(), tokenOwner().address, receiver.address, nonExistentTokenId),
        ).to.be.revertedWithError('OperatorQueryForNonexistentToken', 42);
      });
    });
  });
};

describe.only('ERC721 Warper: Core ERC721 behaviour', () => {
  let deployer: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let tokenOwner: SignerWithAddress;
  let stranger0: SignerWithAddress;
  let stranger1: SignerWithAddress;
  let stranger2: SignerWithAddress;
  let operator: SignerWithAddress;
  let oNFT: ERC721Mock;
  let warperAsDeployer: ERC721WarperMock;
  let warperAsMetaHub: ERC721WarperMock;
  let warperAsTokenOwner: ERC721WarperMock;
  let metahub: FakeContract<Metahub>;

  beforeEach(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');
    [tokenOwner, stranger0, stranger1, stranger2, operator] = await ethers.getUnnamedSigners();

    // TODO remove oNFT deployments
    // Deploy original asset mock.
    oNFT = await new ERC721Mock__factory(nftCreator).deploy('Test ERC721', 'ONFT');

    // Fake MetaHub
    metahub = await smock.fake<Metahub>(Metahub__factory);

    // Deploy preset.
    warperAsDeployer = await new ERC721WarperMock__factory(deployer).deploy();
    await warperAsDeployer.__initialize(
      defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]),
    );

    // TODO: remove the warperAs_ variants, do that inside the tests themselves
    warperAsMetaHub = warperAsDeployer.connect(metahub.wallet);
    warperAsTokenOwner = warperAsDeployer.connect(tokenOwner);
  });

  context('with minted tokens', () => {
    beforeEach(async () => {
      // Set balance to the MetaHub account so we can perform the minting operation here
      await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

      // Mint new NFTs
      await warperAsMetaHub.safeMint(tokenOwner.address, 1);
      await warperAsMetaHub.safeMint(tokenOwner.address, 2);
    });
    // TODO replace all cotnext with describe

    describe('balanceOf', () => {
      context('when the given address owns some tokens', () => {
        it('returns the amount of tokens owned by the given address', async () => {
          expect(await warperAsTokenOwner.balanceOf(tokenOwner.address)).to.be.equal('2');
        });
      });

      context('when the given address does not own any tokens', () => {
        it('returns 0', async () => {
          expect(await warperAsTokenOwner.balanceOf(stranger0.address)).to.be.equal('0');
        });
      });

      context('when querying the zero address', () => {
        it('throws', async () => {
          await expect(warperAsTokenOwner.balanceOf(AddressZero)).to.be.revertedWithError('BalanceQueryForZeroAddress');
        });
      });
    });

    describe('ownerOf', () => {
      context('when the given token ID was tracked by this token', () => {
        const tokenId = 1; // First token ID

        it('returns the owner of the given token ID', async () => {
          expect(await warperAsTokenOwner.ownerOf(tokenId)).to.be.equal(tokenOwner.address);
        });
      });

      context('when the given token ID was not tracked by this token', () => {
        const tokenId = 3; // Non existant token ID

        it('reverts', async () => {
          await expect(warperAsTokenOwner.ownerOf(tokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            tokenId,
          );
        });
      });
    });

    describe('transfers', () => {
      let warperAsStranger: ERC721Warper;
      let warperAsApproved: ERC721Warper;
      let warperAsOperator: ERC721Warper;
      let approved: SignerWithAddress;
      let operator: SignerWithAddress;
      let stranger: SignerWithAddress;
      const tokenId = 1;

      beforeEach(async () => {
        approved = stranger0;
        operator = stranger1;
        stranger = stranger2;

        await warperAsTokenOwner.approve(approved.address, tokenId);
        await warperAsTokenOwner.setApprovalForAll(operator.address, true);
        warperAsStranger = warperAsDeployer.connect(stranger);
        warperAsApproved = warperAsDeployer.connect(approved);
        warperAsOperator = warperAsDeployer.connect(operator);
      });

      context('when the address of the previous owner is incorrect', () => {
        it('reverts', async () => {
          await expect(
            warperAsTokenOwner.transferFrom(stranger.address, stranger.address, tokenId),
          ).to.be.revertedWithError('TransferOfTokenThatIsNotOwn', tokenId);
        });
      });

      context('when the sender is not authorized for the token id', () => {
        it('reverts', async () => {
          await expect(
            warperAsStranger.transferFrom(stranger.address, stranger.address, tokenId),
          ).to.be.revertedWithError('TransferCallerIsNotOwnerNorApproved', stranger.address);
        });
      });

      context('when the given token ID does not exist', () => {
        it('reverts', async () => {
          await expect(
            warperAsTokenOwner.transferFrom(tokenOwner.address, stranger.address, nonExistentTokenId),
          ).to.be.revertedWithError('OperatorQueryForNonexistentToken', nonExistentTokenId);
        });
      });

      context('when the address to transfer the token to is the zero address', () => {
        it('reverts', async () => {
          await expect(
            warperAsTokenOwner.transferFrom(tokenOwner.address, AddressZero, tokenId),
          ).to.be.revertedWithError('TransferToTheZeroAddress');
        });
      });

      describe('via transferFrom', () => {
        shouldTransferTokensByUsers({
          token: () => warperAsTokenOwner,
          tokenId,
          transaction: (as, from, to, tokenId) => warperAsTokenOwner.connect(as).transferFrom(from, to, tokenId),
          toWhom: () => stranger.address,
          approved: () => approved,
          operator: () => tokenOwner, // TODO who is the operator?
          tokenOwner: () => tokenOwner,
          stranger: () => stranger,
        });
      });

      describe('via safeTransferFrom', () => {
        const data = '0x42';

        describe('with data', () => {
          shouldTransferSafely({
            tokenId,
            data,
            token: () => warperAsTokenOwner,
            transaction: (as, from, to, tokenId) =>
              warperAsTokenOwner
                .connect(as)
                ['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data),
            toWhom: () => stranger.address,
            approved: () => approved,
            operator: () => tokenOwner, // TODO who is the operator?
            tokenOwner: () => tokenOwner,
            stranger: () => stranger,
          });
        });

        describe('without data', () => {
          shouldTransferSafely({
            tokenId,
            data: '0x',
            token: () => warperAsTokenOwner,
            transaction: (as, from, to, tokenId) =>
              warperAsTokenOwner.connect(as)['safeTransferFrom(address,address,uint256)'](from, to, tokenId),
            toWhom: () => stranger.address,
            approved: () => approved,
            operator: () => tokenOwner, // TODO who is the operator?
            tokenOwner: () => tokenOwner,
            stranger: () => stranger,
          });
        });

        describe('to a receiver contract returning unexpected value', () => {
          it('reverts', async () => {
            const invalidReceiver = await new ERC721ReceiverMock__factory(deployer).deploy('0x000004a2', 0);
            await expect(
              warperAsTokenOwner['safeTransferFrom(address,address,uint256)'](
                tokenOwner.address,
                invalidReceiver.address,
                tokenId,
              ),
            ).to.be.revertedWithError('TransferToNonERC721ReceiverImplementer', invalidReceiver.address);
          });
        });

        describe('to a receiver contract that reverts with message', () => {
          it('reverts', async () => {
            const invalidReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 1);
            await expect(
              warperAsTokenOwner['safeTransferFrom(address,address,uint256)'](
                tokenOwner.address,
                invalidReceiver.address,
                tokenId,
              ),
            ).to.be.revertedWith('ERC721ReceiverMock: reverting');
          });
        });

        describe('to a receiver contract that reverts without message', () => {
          it('reverts', async () => {
            const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 2);
            await expect(
              warperAsTokenOwner['safeTransferFrom(address,address,uint256)'](
                tokenOwner.address,
                revertingReceiver.address,
                tokenId,
              ),
            ).to.be.revertedWithError('TransferToNonERC721ReceiverImplementer', revertingReceiver.address);
          });
        });

        describe('to a receiver contract that panics', () => {
          it('reverts', async () => {
            const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 3);
            await expect(
              warperAsTokenOwner['safeTransferFrom(address,address,uint256)'](
                tokenOwner.address,
                revertingReceiver.address,
                tokenId,
              ),
            ).to.be.revertedWith('panic code');
          });
        });

        describe('to a contract that does not implement the required function', () => {
          it('reverts', async () => {
            await expect(
              warperAsTokenOwner['safeTransferFrom(address,address,uint256)'](
                tokenOwner.address,
                warperAsTokenOwner.address,
                tokenId,
              ),
            ).to.be.revertedWithError('TransferToNonERC721ReceiverImplementer', warperAsTokenOwner.address);
          });
        });
      });
    });

    describe('safe mint', () => {
      const tokenId = 4;
      const data = '0x000004a2';

      describe('via safeMint', () => {
        // NOTE: `safeMint()` with data is not exposed on the warper NFT!

        it('calls onERC721Received — without data', async () => {
          const receiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 0);
          const tx = warperAsMetaHub.safeMint(receiver.address, tokenId);

          await expect(tx).to.emit(receiver, 'Received').withArgs(metahub.address, AddressZero, tokenId, '0x');
        });

        context('to a receiver contract returning unexpected value', () => {
          it('reverts', async () => {
            const invalidReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(data, 0);

            await expect(warperAsMetaHub.safeMint(invalidReceiver.address, tokenId)).to.be.revertedWithError(
              'TransferToNonERC721ReceiverImplementer',
              invalidReceiver.address,
            );
          });
        });

        context('to a receiver contract that reverts with message', () => {
          it('reverts', async () => {
            const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 1);

            await expect(warperAsMetaHub.safeMint(revertingReceiver.address, tokenId)).to.be.revertedWith(
              'ERC721ReceiverMock: reverting',
            );
          });
        });

        context('to a receiver contract that reverts without message', () => {
          it('reverts', async () => {
            const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 2);

            await expect(warperAsMetaHub.safeMint(revertingReceiver.address, tokenId)).to.be.revertedWithError(
              'TransferToNonERC721ReceiverImplementer',
              revertingReceiver.address,
            );
          });
        });

        context('to a receiver contract that panics', () => {
          it('reverts', async () => {
            const revertingReceiver = await new ERC721ReceiverMock__factory(deployer).deploy(RECEIVER_MAGIC_VALUE, 3);

            await expect(warperAsMetaHub.safeMint(revertingReceiver.address, tokenId)).to.be.revertedWith('panic code');
          });
        });

        context('to a contract that does not implement the required function', () => {
          it('reverts', async () => {
            await expect(warperAsMetaHub.safeMint(warperAsMetaHub.address, tokenId)).to.be.revertedWithError(
              'TransferToNonERC721ReceiverImplementer',
              warperAsMetaHub.address,
            );
          });
        });
      });
    });

    describe('approve', () => {
      const tokenId = 1;
      let approved: SignerWithAddress;

      beforeEach(() => {
        approved = stranger2;
      });

      context('when clearing approval', () => {
        context('when there was no prior approval', () => {
          let approvalTx: ContractTransaction;
          beforeEach(async () => {
            approvalTx = await warperAsTokenOwner.approve(AddressZero, tokenId);
          });

          itClearsApproval({
            token: () => warperAsTokenOwner,
            tokenId,
          });

          itEmitsApprovalEvent({
            token: () => warperAsTokenOwner,
            transaction: () => approvalTx,
            tokenId,
            owner: () => tokenOwner.address,
            approved: () => AddressZero,
          });
        });

        context('when there was a prior approval', () => {
          let approvalTx: ContractTransaction;
          beforeEach(async () => {
            await warperAsTokenOwner.approve(stranger0.address, tokenId);
            approvalTx = await warperAsTokenOwner.approve(AddressZero, tokenId);
          });

          itClearsApproval({
            token: () => warperAsTokenOwner,
            tokenId,
          });

          itEmitsApprovalEvent({
            token: () => warperAsTokenOwner,
            transaction: () => approvalTx,
            tokenId,
            owner: () => tokenOwner.address,
            approved: () => AddressZero,
          });
        });
      });

      context('when approving a non-zero address', () => {
        context('when there was no prior approval', () => {
          let approvalTx: ContractTransaction;
          beforeEach(async () => {
            approvalTx = await warperAsTokenOwner.approve(approved.address, tokenId);
          });

          itApproves({
            token: () => warperAsTokenOwner,
            tokenId,
            address: () => approved.address,
          });

          itEmitsApprovalEvent({
            token: () => warperAsTokenOwner,
            transaction: () => approvalTx,
            tokenId,
            owner: () => tokenOwner.address,
            approved: () => approved.address,
          });
        });

        context('when there was a prior approval to the same address', () => {
          let approvalTx: ContractTransaction;
          beforeEach(async () => {
            await warperAsTokenOwner.approve(approved.address, tokenId);
            approvalTx = await warperAsTokenOwner.approve(approved.address, tokenId);
          });

          itApproves({
            token: () => warperAsTokenOwner,
            tokenId,
            address: () => approved.address,
          });

          itEmitsApprovalEvent({
            token: () => warperAsTokenOwner,
            transaction: () => approvalTx,
            tokenId,
            owner: () => tokenOwner.address,
            approved: () => approved.address,
          });
        });

        context('when there was a prior approval to a different address', () => {
          let approvalTx: ContractTransaction;
          beforeEach(async () => {
            await warperAsTokenOwner.approve(stranger0.address, tokenId);
            approvalTx = await warperAsTokenOwner.approve(stranger0.address, tokenId);
          });

          itApproves({
            token: () => warperAsTokenOwner,
            tokenId,
            address: () => stranger0.address,
          });

          itEmitsApprovalEvent({
            token: () => warperAsTokenOwner,
            transaction: () => approvalTx,
            tokenId,
            owner: () => tokenOwner.address,
            approved: () => stranger0.address,
          });
        });
      });

      context('when the address that receives the approval is the owner', () => {
        it('reverts', async () => {
          await expect(warperAsTokenOwner.approve(tokenOwner.address, tokenId)).to.be.revertedWithError(
            'ApprovalToCurrentOwner',
            tokenOwner.address,
          );
        });
      });

      context('when the sender does not own the given token ID', () => {
        it('reverts', async () => {
          await expect(
            warperAsTokenOwner.connect(stranger1).approve(approved.address, tokenId),
          ).to.be.revertedWithError('ApproveCallerIsNotOwnerNorApprovedForAll', stranger1.address);
        });
      });

      context('when the sender is approved for the given token ID', () => {
        it('reverts', async () => {
          await warperAsTokenOwner.approve(approved.address, tokenId);
          await expect(
            warperAsTokenOwner.connect(approved).approve(stranger1.address, tokenId),
          ).to.be.revertedWithError('ApproveCallerIsNotOwnerNorApprovedForAll', approved.address);
        });
      });

      context('when the given token ID does not exist', () => {
        it('reverts', async () => {
          await expect(
            warperAsTokenOwner.connect(stranger0).approve(stranger1.address, nonExistentTokenId),
          ).to.be.revertedWithError('OwnerQueryForNonexistentToken', nonExistentTokenId);
        });
      });
    });

    describe('setApprovalForAll', () => {
      context('when the operator willing to approve is not the owner', () => {
        context('when there is no operator approval set by the sender', () => {
          it('approves the operator', async () => {
            await warperAsTokenOwner.setApprovalForAll(operator.address, true);

            await expect(warperAsTokenOwner.isApprovedForAll(tokenOwner.address, operator.address)).to.eventually.equal(
              true,
            );
          });

          it('emits an approval event', async () => {
            await expect(warperAsTokenOwner.setApprovalForAll(operator.address, true))
              .to.emit(warperAsTokenOwner, 'ApprovalForAll')
              .withArgs(tokenOwner.address, operator.address, true);
          });
        });

        context('when the operator was set as not approved', () => {
          beforeEach(async () => {
            await warperAsTokenOwner.setApprovalForAll(operator.address, false);
          });

          it('approves the operator', async () => {
            await warperAsTokenOwner.setApprovalForAll(operator.address, true);

            await expect(warperAsTokenOwner.isApprovedForAll(tokenOwner.address, operator.address)).to.eventually.equal(
              true,
            );
          });

          it('emits an approval event', async () => {
            await expect(warperAsTokenOwner.setApprovalForAll(operator.address, true))
              .to.emit(warperAsTokenOwner, 'ApprovalForAll')
              .withArgs(tokenOwner.address, operator.address, true);
          });

          it('can unset the operator approval', async () => {
            await warperAsTokenOwner.setApprovalForAll(operator.address, false);

            await expect(warperAsTokenOwner.isApprovedForAll(tokenOwner.address, operator.address)).to.eventually.equal(
              false,
            );
          });
        });

        context('when the operator was already approved', () => {
          beforeEach(async () => {
            await warperAsTokenOwner.setApprovalForAll(operator.address, true);
          });

          it('keeps the approval to the given address', async () => {
            await warperAsTokenOwner.setApprovalForAll(operator.address, true);

            await expect(warperAsTokenOwner.isApprovedForAll(tokenOwner.address, operator.address)).to.eventually.equal(
              true,
            );
          });

          it('emits an approval event', async () => {
            await expect(warperAsTokenOwner.setApprovalForAll(operator.address, true))
              .to.emit(warperAsTokenOwner, 'ApprovalForAll')
              .withArgs(tokenOwner.address, operator.address, true);
          });
        });
      });

      context('when the operator is the owner', () => {
        it('reverts', async () => {
          await expect(warperAsTokenOwner.setApprovalForAll(tokenOwner.address, true)).to.be.revertedWithError(
            'ApproveToCaller',
          );
        });
      });
    });

    describe('getApproved', () => {
      let approved: SignerWithAddress;

      beforeEach(() => {
        approved = stranger2;
      });

      context('when token is not minted', () => {
        it('reverts', async () => {
          await expect(warperAsTokenOwner.getApproved(nonExistentTokenId)).to.be.revertedWithError(
            'ApprovedQueryForNonexistentToken',
            nonExistentTokenId,
          );
        });
      });

      context('when token has been minted ', () => {
        it('should return the zero address', async () => {
          await expect(warperAsTokenOwner.getApproved(1)).to.eventually.be.equal(AddressZero);
        });

        context('when account has been approved', () => {
          beforeEach(async () => {
            await warperAsTokenOwner.approve(approved.address, 1);
          });

          it('returns approved account', async () => {
            await expect(warperAsTokenOwner.getApproved(1)).to.eventually.equal(approved.address);
          });
        });
      });
    });
  });

  describe('_mint(address, uint256)', () => {
    const tokenIdToMint = 4321;

    it('reverts with a null destination address', async () => {
      await expect(warperAsDeployer.mint(AddressZero, tokenIdToMint)).to.be.revertedWithError('MintToTheZeroAddress');
    });

    context('with minted token', () => {
      let mintTx: ContractTransaction;
      beforeEach(async () => {
        mintTx = await warperAsDeployer.mint(tokenOwner.address, tokenIdToMint);
      });

      it('emits a Transfer event', () => {
        expect(mintTx).to.emit(warperAsDeployer, 'Transfer').withArgs(AddressZero, tokenOwner.address, tokenIdToMint);
      });

      it('creates the token', async () => {
        await expect(warperAsDeployer.balanceOf(tokenOwner.address)).to.eventually.be.equal('1');
        await expect(warperAsDeployer.ownerOf(tokenIdToMint)).to.eventually.equal(tokenOwner.address);
      });

      it('reverts when adding a token id that already exists', async () => {
        await expect(warperAsDeployer.mint(tokenOwner.address, tokenIdToMint)).to.be.revertedWithError(
          'TokenIsAlreadyMinted',
          tokenIdToMint,
        );
      });
    });
  });

  describe('_burn', function () {
    const firstTokenId = 1;
    const secondTokenId = 2;
    it('reverts when burning a non-existent token id', async function () {
      await expect(warperAsDeployer.burn(nonExistentTokenId)).to.be.revertedWithError(
        'OwnerQueryForNonexistentToken',
        nonExistentTokenId,
      );
    });

    context('with minted tokens', function () {
      beforeEach(async function () {
        await warperAsDeployer.mint(tokenOwner.address, firstTokenId);
        await warperAsDeployer.mint(tokenOwner.address, secondTokenId);
      });

      context('with burnt token', function () {
        let burnTx: ContractTransaction;
        beforeEach(async function () {
          burnTx = await warperAsDeployer.burn(firstTokenId);
        });

        it('emits a Transfer event', function () {
          expect(burnTx)
            .to.be.emit(warperAsDeployer, 'Transfer')
            .withArgs(tokenOwner.address, AddressZero, firstTokenId);
        });

        it('emits an Approval event', function () {
          expect(burnTx)
            .to.be.emit(warperAsDeployer, 'Approval')
            .withArgs(tokenOwner.address, AddressZero, firstTokenId);
        });

        it('deletes the token', async function () {
          await expect(warperAsDeployer.balanceOf(tokenOwner.address)).to.eventually.equal('1');

          await expect(warperAsDeployer.ownerOf(firstTokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            firstTokenId,
          );
        });

        it('reverts when burning a token id that has been deleted', async function () {
          await expect(warperAsDeployer.burn(firstTokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            firstTokenId,
          );
        });
      });
    });
  });
});
