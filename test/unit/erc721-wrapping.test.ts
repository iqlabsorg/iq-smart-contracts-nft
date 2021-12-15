import { ethers, getNamedAccounts } from 'hardhat';
import { expect } from 'chai';
import { ERC721Mock, ERC721Wrapping, ERC721Wrapping__factory } from '../../typechain';

describe('ERC721 Wrapping', () => {
  let oNFT: ERC721Mock;

  before(async () => {
    const { nftCreator } = await getNamedAccounts();
    oNFT = await ethers.getContract('ERC721Mock', nftCreator);
  });

  describe('Wrapping', () => {
    it('verifies the original NFT contract existence');
    it('ensures the original NFT interface compatibility');
  });

  describe('When original NFT is wrapped', () => {
    let wNFT: ERC721Wrapping;

    beforeEach(async () => {
      const deployer = await ethers.getNamedSigner('deployer');
      const wrappingFactory = new ERC721Wrapping__factory(deployer);
      wNFT = await wrappingFactory.deploy(oNFT.address);
      await wNFT.deployed();
    });

    it('returns the oNFT address', async () => {
      await expect(wNFT.getOrigin()).to.eventually.eq(oNFT.address);
    });
  });
});
