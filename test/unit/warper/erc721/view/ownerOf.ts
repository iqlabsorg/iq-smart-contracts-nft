import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../typechain';
import { WarperRentalStatus } from '../../../../shared/utils';

export function shouldBehaveLikeOwnerOf(): void {
  const mintedTokenId = 445566;
  let erc721Warper: ERC721Warper;
  let metahub: FakeContract<Metahub>;

  let nftTokenOwner: SignerWithAddress;

  beforeEach(async function () {
    nftTokenOwner = this.signers.unnamed[0];
    metahub = this.mocks.metahub;
    erc721Warper = this.contracts.presets.erc721Warper;

    await erc721Warper.connect(metahub.wallet).mint(nftTokenOwner.address, mintedTokenId, '0x');
  });

  describe('ownerOf', () => {
    context('when the token has never been rented', () => {
      beforeEach(() => {
        metahub.getWarperRentalStatus.returns(WarperRentalStatus.NOT_MINTED);
      });

      it('reverts', async () => {
        await expect(erc721Warper.ownerOf(mintedTokenId)).to.be.revertedWith(
          `OwnerQueryForNonexistentToken(${mintedTokenId})`,
        );
      });
    });

    context('when the token has been minted but currently has not been rented', () => {
      beforeEach(() => {
        metahub.getWarperRentalStatus.returns(WarperRentalStatus.MINTED);
      });

      it('returns metahub address', async () => {
        await expect(erc721Warper.ownerOf(mintedTokenId)).to.eventually.equal(metahub.address);
      });
    });

    context('when the token is currently rented', () => {
      beforeEach(() => {
        metahub.getWarperRentalStatus.returns(WarperRentalStatus.RENTED);
      });

      it('returns the current owner of the token', async () => {
        await expect(erc721Warper.ownerOf(mintedTokenId)).to.eventually.equal(nftTokenOwner.address);
      });
    });
  });
}
