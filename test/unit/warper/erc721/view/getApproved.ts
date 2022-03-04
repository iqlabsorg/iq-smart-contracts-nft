import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../typechain';
import { AddressZero } from '../../../../shared/types';
import { WarperRentalStatus } from '../../../../shared/utils';

export function shouldBehaveLikeGetApproved(): void {
  describe('getApproved', function () {
    let erc721Warper: ERC721Warper;
    let metahub: FakeContract<Metahub>;

    let assetOwner: SignerWithAddress;
    let approved: SignerWithAddress;

    const nonExistentTokenId = 42;
    const mintedTokenId = 4455666;

    beforeEach(async function () {
      metahub = this.mocks.metahub;
      erc721Warper = this.contracts.presets.erc721Warper;

      assetOwner = this.signers.named['assetOwner'];
      approved = this.signers.named['operator'];

      await erc721Warper.connect(metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    context('when token is not minted', () => {
      it('reverts', async () => {
        await expect(erc721Warper.connect(assetOwner).getApproved(nonExistentTokenId)).to.be.revertedWith(
          `ApprovedQueryForNonexistentToken(${nonExistentTokenId})`,
        );
      });
    });

    context('when token has been minted ', () => {
      it('should return the zero address', async () => {
        await expect(erc721Warper.connect(assetOwner).getApproved(mintedTokenId)).to.eventually.be.equal(AddressZero);
      });

      context('when account has been approved', () => {
        beforeEach(async () => {
          metahub.getWarperRentalStatus.returns(WarperRentalStatus.RENTED);

          await erc721Warper.connect(assetOwner).approve(approved.address, mintedTokenId);
        });

        it('returns approved account', async () => {
          await expect(erc721Warper.connect(assetOwner).getApproved(mintedTokenId)).to.eventually.equal(
            approved.address,
          );
        });
      });
    });
  });
}
