import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

export function shouldBehaveLikeGetMetahub(): void {
  describe('__metahub', function () {
    let warper: ERC721Warper;
    let metahub: FakeContract<Metahub>;

    beforeEach(function () {
      warper = this.contracts.erc721Warper;
      metahub = this.mocks.metahub;
    });

    it('returns the metahub address', async () => {
      await expect(warper.__metahub()).to.eventually.eq(metahub.address);
    });
  });
}
