import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import {
  ERC20Mock__factory,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Wrapping,
  ERC721Wrapping__factory,
} from '../../typechain';
import { expectError } from '../utils';

describe('ERC721 Wrapping', () => {
  let deployer: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let oNFT: ERC721Mock;

  before(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');
    // Deploy original NFT
    const erc721Factory = new ERC721Mock__factory(nftCreator);
    oNFT = await erc721Factory.deploy('Test ERC721', 'ONFT');
    await oNFT.deployed();
  });

  describe('Wrapping', () => {
    it('ensures the original NFT interface compatibility', async () => {
      const wrappingFactory = new ERC721Wrapping__factory(deployer);
      const erc20Factory = new ERC20Mock__factory(nftCreator);
      const erc20Token = await erc20Factory.deploy('Random ERC20', 'TST', 18, 1);
      await expectError(wrappingFactory.deploy(erc20Token.address), 'InvalidOriginalTokenInterface', [
        erc20Token.address,
        '0x5b5e139f',
      ]);
    });
  });

  describe('When original NFT is wrapped', () => {
    let wNFT: ERC721Wrapping;

    beforeEach(async () => {
      const wrappingFactory = new ERC721Wrapping__factory(deployer);
      wNFT = await wrappingFactory.deploy(oNFT.address);
      await wNFT.deployed();
    });

    describe('Wrapping Interface', () => {
      it('returns the original asset address', async () => {
        await expect(wNFT.__original()).to.eventually.eq(oNFT.address);
      });
    });

    it('can forward the call to the oNFT', async () => {
      await expect(ERC20Mock__factory.connect(wNFT.address, deployer).symbol()).to.eventually.eq('ONFT');
    });
  });
});
