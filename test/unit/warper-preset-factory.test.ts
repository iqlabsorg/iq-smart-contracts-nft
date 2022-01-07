import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { WarperPresetFactory, WarperPresetFactory__factory } from '../../typechain';
import { expect } from 'chai';

const { formatBytes32String } = ethers.utils;

describe('Warper Preset Factory', () => {
  let deployer: SignerWithAddress;
  let warperPresetFactory: WarperPresetFactory;

  before(async () => {
    deployer = await ethers.getNamedSigner('deployer');

    warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();
  });

  it('returns empty preset list', async () => {
    await expect(warperPresetFactory.getPresets()).to.eventually.deep.eq([]);
  });

  describe('When registering new preset', () => {
    it('ensures preset ID is unique');
    it('ensures preset implementation has correct interface');
  });
});
