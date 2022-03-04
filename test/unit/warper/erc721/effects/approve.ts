import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, ContractTransaction } from 'ethers';
import { ERC721Warper } from '../../../../../typechain';
import { AddressZero } from '../../../../shared/types';

export function shouldBehaveLikeApprove(): void {
  describe('approve', function () {
    const nonExistentTokenId = 42;
    const mintedTokenId = 445566;

    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let approved: SignerWithAddress;
    let stranger0: SignerWithAddress;
    let stranger1: SignerWithAddress;

    beforeEach(async function () {
      warper = this.contracts.erc721Warper;
      assetOwner = this.signers.named['assetOwner'];
      approved = this.signers.named['operator'];

      [stranger0, stranger1] = this.signers.unnamed;

      await warper.connect(this.mocks.metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    // Reusable test case dependencies
    // NOTE: Set these parameters
    let approvalTx: ContractTransaction;
    let approvalArgs: {
      owner: string;
      approved: string;
      tokenId: BigNumberish;
    };

    const itClearsApproval = function () {
      it('clears approval for the token', async function () {
        await expect(warper.getApproved(mintedTokenId)).to.eventually.equal(AddressZero);
      });
    };

    const itEmitsApprovalEvent = function () {
      it('emits an approval event', function () {
        expect(approvalTx)
          .to.emit(warper, 'Approval')
          .withArgs(approvalArgs.owner, approvalArgs.approved, approvalArgs.tokenId);
      });
    };

    const itApproves = function () {
      it('sets the approval for the target address', async function () {
        await expect(warper.getApproved(mintedTokenId)).to.eventually.equal(approvalArgs.approved);
      });
    };

    context('when clearing approval', function () {
      context('when there was no prior approval', function () {
        beforeEach(async function () {
          approvalTx = await warper.connect(assetOwner).approve(AddressZero, mintedTokenId);
          approvalArgs = {
            approved: AddressZero,
            owner: assetOwner.address,
            tokenId: mintedTokenId,
          };
        });

        itClearsApproval();
        itEmitsApprovalEvent();
      });

      context('when there was a prior approval', function () {
        beforeEach(async function () {
          await warper.connect(assetOwner).approve(stranger0.address, mintedTokenId);

          approvalTx = await warper.connect(assetOwner).approve(AddressZero, mintedTokenId);
          approvalArgs = {
            approved: AddressZero,
            owner: assetOwner.address,
            tokenId: mintedTokenId,
          };
        });

        itClearsApproval();
        itEmitsApprovalEvent();
      });
    });

    context('when approving a non-zero address', function () {
      context('when there was no prior approval', function () {
        beforeEach(async function () {
          approvalTx = await warper.connect(assetOwner).approve(approved.address, mintedTokenId);
          approvalArgs = {
            approved: approved.address,
            owner: assetOwner.address,
            tokenId: mintedTokenId,
          };
        });

        itApproves();
        itEmitsApprovalEvent();
      });

      context('when there was a prior approval to the same address', function () {
        beforeEach(async function () {
          await warper.connect(assetOwner).approve(approved.address, mintedTokenId);
          approvalTx = await warper.connect(assetOwner).approve(approved.address, mintedTokenId);

          approvalArgs = {
            approved: approved.address,
            owner: assetOwner.address,
            tokenId: mintedTokenId,
          };
        });

        itApproves();
        itEmitsApprovalEvent();
      });

      context('when there was a prior approval to a different address', function () {
        beforeEach(async function () {
          await warper.connect(assetOwner).approve(stranger0.address, mintedTokenId);

          approvalTx = await warper.connect(assetOwner).approve(stranger0.address, mintedTokenId);
          approvalArgs = {
            approved: stranger0.address,
            owner: assetOwner.address,
            tokenId: mintedTokenId,
          };
        });

        itApproves();
        itEmitsApprovalEvent();
      });
    });

    context('when the address that receives the approval is the owner', function () {
      it('reverts', async function () {
        await expect(warper.connect(assetOwner).approve(assetOwner.address, mintedTokenId)).to.be.revertedWith(
          `ApprovalToCurrentOwner("${assetOwner.address}")`,
        );
      });
    });

    context('when the sender does not own the given token ID', function () {
      it('reverts', async function () {
        await expect(
          warper.connect(assetOwner).connect(stranger1).approve(approved.address, mintedTokenId),
        ).to.be.revertedWith(`ApproveCallerIsNotOwnerNorApprovedForAll("${stranger1.address}")`);
      });
    });

    context('when the sender is approved for the given token ID', function () {
      it('reverts', async function () {
        await warper.connect(assetOwner).approve(approved.address, mintedTokenId);
        await expect(
          warper.connect(assetOwner).connect(approved).approve(stranger1.address, mintedTokenId),
        ).to.be.revertedWith(`ApproveCallerIsNotOwnerNorApprovedForAll("${approved.address}")`);
      });
    });

    context('when the given token ID does not exist', function () {
      it('reverts', async function () {
        await expect(
          warper.connect(assetOwner).connect(stranger0).approve(stranger1.address, nonExistentTokenId),
        ).to.be.revertedWith(`OwnerQueryForNonexistentToken(${nonExistentTokenId})`);
      });
    });
  });
}
