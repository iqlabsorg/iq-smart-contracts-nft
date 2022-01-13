import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { UniverseToken, UniverseToken__factory } from '../../typechain';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { expectError } from '../utils';

const { AddressZero } = ethers.constants;

describe('Universe Token', () => {
  let deployer: SignerWithAddress;
  let metahub: SignerWithAddress;
  let universeOwner: SignerWithAddress;
  let universe: UniverseToken;

  beforeEach(async () => {
    [deployer, metahub, universeOwner] = await ethers.getSigners();
    universe = await new UniverseToken__factory(deployer).deploy(metahub.address);
  });

  it('has correct name', async () => {
    await expect(universe.name()).to.eventually.eq('IQVerse');
  });

  it('has correct symbol', async () => {
    await expect(universe.symbol()).to.eventually.eq('IQV');
  });

  it('has correct owner', async () => {
    await expect(universe.owner()).to.eventually.eq(deployer.address);
  });

  describe('Minting', () => {
    it('owner cannot mint', async () => {
      await expectError(universe.mint(universeOwner.address), 'CallerIsNotMetahub');
    });

    it('metahub can mint', async () => {
      await expect(universe.connect(metahub).mint(universeOwner.address))
        .to.emit(universe, 'Transfer')
        .withArgs(AddressZero, universeOwner.address, 1);
      await expect(universe.ownerOf(1)).to.eventually.eq(universeOwner.address);
    });
  });

  describe('When minted', () => {
    beforeEach(async () => {
      await universe.connect(metahub).mint(universeOwner.address);
    });

    it('returns token URI', async () => {
      await expect(universe.tokenURI(1)).to.eventually.eq('');
    });

    it('owner can set token URI');
  });
});
