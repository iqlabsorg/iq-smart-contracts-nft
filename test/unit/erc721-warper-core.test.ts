import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FakeContract, MockContract, smock } from '@defi-wonderland/smock';
import {
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Warper,
  ERC721Warper__factory,
  Metahub,
  Metahub__factory,
} from '../../typechain';

const { AddressZero } = ethers.constants;
const { defaultAbiCoder } = ethers.utils;

describe.only('ERC721 Warper: Core ERC721 behaviour', () => {
  let deployer: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let tokenOwner: SignerWithAddress;
  let stranger: SignerWithAddress;
  let oNFT: ERC721Mock;
  let warperAsDeployer: ERC721Warper;
  let warperAsMetaHub: ERC721Warper;
  let warperAsTokenOwner: ERC721Warper;
  let metahub: FakeContract<Metahub>;

  before(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');
    [tokenOwner, stranger] = await ethers.getUnnamedSigners();

    // Deploy original asset mock.
    oNFT = await new ERC721Mock__factory(nftCreator).deploy('Test ERC721', 'ONFT');

    // Fake MetaHub
    metahub = await smock.fake<Metahub>(Metahub__factory);
  });

  context('with minted tokens', function () {
    beforeEach(async function () {
      // Deploy preset.
      warperAsDeployer = await new ERC721Warper__factory(deployer).deploy();
      await warperAsDeployer.__initialize(
        defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]),
      );

      warperAsMetaHub = warperAsDeployer.connect(metahub.wallet);
      warperAsTokenOwner = warperAsDeployer.connect(tokenOwner);

      // Set balance to the MetaHub account so we can perform the minting operation here
      await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

      // Mint new NFTs
      await warperAsMetaHub.safeMint(tokenOwner.address, 1);
      await warperAsMetaHub.safeMint(tokenOwner.address, 2);
    });

    describe('balanceOf', function () {
      context('when the given address owns some tokens', function () {
        it('returns the amount of tokens owned by the given address', async function () {
          expect(await warperAsTokenOwner.balanceOf(tokenOwner.address)).to.be.equal('2');
        });
      });

      context('when the given address does not own any tokens', function () {
        it('returns 0', async function () {
          expect(await warperAsTokenOwner.balanceOf(stranger.address)).to.be.equal('0');
        });
      });

      context('when querying the zero address', function () {
        it('throws', async function () {
          await expect(warperAsTokenOwner.balanceOf(AddressZero)).to.be.revertedWithError('BalanceQueryForZeroAddress');
        });
      });
    });

    describe('ownerOf', function () {
      context('when the given token ID was tracked by this token', function () {
        const tokenId = 1; // First token ID

        it('returns the owner of the given token ID', async function () {
          expect(await warperAsTokenOwner.ownerOf(tokenId)).to.be.equal(tokenOwner.address);
        });
      });

      context('when the given token ID was not tracked by this token', function () {
        const tokenId = 3; // Non existant token ID

        it('reverts', async function () {
          await expect(warperAsTokenOwner.ownerOf(tokenId)).to.be.revertedWithError(
            'ERC721: owner query for nonexistent token',
          );
        });
      });
    });
  });
});
