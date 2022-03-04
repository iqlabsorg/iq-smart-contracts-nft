import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Mock, ERC721Mock__factory, ERC721Warper } from '../../../../typechain';

export function shouldBehaveLikeAbleToForwardCalls(): void {
  describe('call forwarding', function () {
    let warper: ERC721Warper;
    let originalNft: ERC721Mock;
    let deployer: SignerWithAddress;

    beforeEach(function () {
      warper = this.contracts.erc721Warper;
      originalNft = this.mocks.assets.erc721;

      deployer = this.signers.named['deployer'];
    });

    it('can forward the call to the original asset contract', async () => {
      const expectedSymbol = await originalNft.symbol();
      await expect(ERC721Mock__factory.connect(warper.address, deployer).symbol()).to.eventually.eq(expectedSymbol);
    });
  });
}
