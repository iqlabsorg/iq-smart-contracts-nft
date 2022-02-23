import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Ownable } from '../../../../typechain';

export function shouldBehaveLikeCorrectOwner(): void {
  let universe: Ownable;
  let deployer: SignerWithAddress;

  beforeEach(function () {
    universe = this.contracts.universeToken as unknown as Ownable;
    deployer = this.signers.named['deployer'];
  });

  describe('Owner', () => {
    it('has correct owner', async () => {
      await expect(universe.owner()).to.eventually.eq(deployer.address);
    });
  });
}
