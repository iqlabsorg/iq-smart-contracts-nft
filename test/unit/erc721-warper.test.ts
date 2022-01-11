import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import {
  ERC20Mock__factory,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Warper,
  ERC721Warper__factory,
} from '../../typechain';
import { expectError } from '../utils';

const { AddressZero } = ethers.constants;
const { defaultAbiCoder } = ethers.utils;

describe('ERC721 Warper', () => {
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

  describe('Warper', () => {
    it('ensures the original NFT interface compatibility', async () => {
      const warperFactory = new ERC721Warper__factory(deployer);
      const erc20Factory = new ERC20Mock__factory(nftCreator);
      const erc20Token = await erc20Factory.deploy('Random ERC20', 'TST', 18, 1);
      const wNFT = await warperFactory.deploy();

      await expectError(
        wNFT.iqInitialize(defaultAbiCoder.encode(['address', 'address'], [erc20Token.address, AddressZero])),
        'InvalidOriginalTokenInterface',
        [erc20Token.address, '0x5b5e139f'],
      );
    });
  });

  describe('When original NFT is wrapped', () => {
    let wNFT: ERC721Warper;

    beforeEach(async () => {
      const warperFactory = new ERC721Warper__factory(deployer);
      wNFT = await warperFactory.deploy();

      await wNFT.iqInitialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, AddressZero]));
    });

    describe('Warper Interface', () => {
      it('returns the original asset address', async () => {
        await expect(wNFT.iqOriginal()).to.eventually.eq(oNFT.address);
      });
    });

    it('can forward the call to the oNFT', async () => {
      await expect(ERC721Mock__factory.connect(wNFT.address, deployer).symbol()).to.eventually.eq('ONFT');
    });
  });
});
