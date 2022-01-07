import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { WarperFactory, WarperFactory__factory } from '../../typechain';
import { expect } from 'chai';

const { formatBytes32String } = ethers.utils;

describe('Warper Factory', () => {
  let deployer: SignerWithAddress;
  let warperFactory: WarperFactory;

  before(async () => {
    deployer = await ethers.getNamedSigner('deployer');

    warperFactory = await new WarperFactory__factory(deployer).deploy();
  });

  it('returns empty preset list', async () => {
    await expect(warperFactory.getPresets()).to.eventually.deep.eq([]);
  });

  describe('When registering new preset', () => {
    it('ensures preset ID is unique');
    it('ensures preset implementation has correct interface');
  });
});
