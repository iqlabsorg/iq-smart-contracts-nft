import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../../typechain';

export function shouldBehaveLikeGetApproved(): void {
  describe('getApproved', function () {
    const nonExistentTokenId = 42;
    const mintedTokenId = 4455666;

    let erc721warper: ERC721Warper;
    let metahub: FakeContract<Metahub>;
    let assetOwner: SignerWithAddress;

    beforeEach(async function () {
      metahub = this.mocks.metahub;
      assetOwner = this.signers.named['assetOwner'];
      erc721warper = this.contracts.erc721Warper;

      await erc721warper.connect(metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    context('when token is not minted', () => {
      it('reverts', async () => {
        await expect(erc721warper.connect(assetOwner).getApproved(nonExistentTokenId)).to.be.revertedWith(
          `MethodNotAllowed()`,
        );
      });
    });

    context('when token has been minted', () => {
      it('reverts', async () => {
        await expect(erc721warper.connect(assetOwner).getApproved(mintedTokenId)).to.be.revertedWith(
          `MethodNotAllowed()`,
        );
      });
    });
  });
}
