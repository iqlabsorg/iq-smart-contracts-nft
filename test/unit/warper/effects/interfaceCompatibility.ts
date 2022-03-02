import { expect } from 'chai';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ERC20, IWarperPreset } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

export function shouldBehaveLikeRejectERC20TokenInterface(): void {
  describe('ERC721 interface compatability', function () {
    let warper: IWarperPreset;
    let randomERC20: ERC20;

    beforeEach(function () {
      warper = this.contracts.presets.genericPreset as unknown as IWarperPreset;
      randomERC20 = this.mocks.assets.erc20 as unknown as ERC20;
    });

    describe('ensures the original NFT interface compatibility', () => {
      it('reverts', async () => {
        await expect(
          warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [randomERC20.address, AddressZero])),
        ).to.be.revertedWith(`InvalidOriginalTokenInterface("${randomERC20.address}", "${'0x5b5e139f'}")`);
      });
    });
  });
}
