import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Ownable } from '../../../typechain';

export function shouldBehavesLikeOwnable() {
  let ownable: Ownable;
  let deployer: SignerWithAddress;

  beforeEach(function () {
    ownable = this.contracts.ownable;
  });

  describe('Ownable', () => {
    it('has the owner set', async () => {
      await expect(ownable.owner()).to.eventually.equal(deployer.address);
    });
  });
}
