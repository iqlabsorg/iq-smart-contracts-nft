import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Warper,
  ERC721Warper__factory,
  Metahub,
  Metahub__factory,
  MetahubV2Mock,
  MetahubV2Mock__factory,
  UniverseToken,
  UniverseToken__factory,
  WarperPresetFactory,
  WarperPresetFactory__factory,
} from '../../typechain';
import { createUniverse, deployWarper, wait } from '../utils';
import { BigNumber } from 'ethers';

const { formatBytes32String } = ethers.utils;

describe('Metahub', () => {
  const warperPresetId = formatBytes32String('ERC721Basic');
  let deployer: SignerWithAddress;
  let stranger: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let erc721Factory: ERC721Mock__factory;
  let universeToken: UniverseToken;
  let oNFT: ERC721Mock;
  let erc721WarperImpl: ERC721Warper;
  let warperPresetFactory: WarperPresetFactory;
  let metahub: Metahub;

  before(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');
    [stranger] = await ethers.getUnnamedSigners();

    // Deploy original NFT
    erc721Factory = new ERC721Mock__factory(nftCreator);
    oNFT = await erc721Factory.deploy('Test ERC721', 'ONFT');
    await oNFT.deployed();

    // Deploy warper preset factory
    warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();

    // Deploy and register warper preset
    erc721WarperImpl = await new ERC721Warper__factory(deployer).deploy();
    await warperPresetFactory.addPreset(warperPresetId, erc721WarperImpl.address);
  });

  beforeEach(async () => {
    // Deploy Metahub
    metahub = (await upgrades.deployProxy(new Metahub__factory(deployer), [warperPresetFactory.address], {
      kind: 'uups',
      initializer: false,
    })) as Metahub;

    // Deploy Universe token.
    const universeTokenFactory = new UniverseToken__factory(deployer);
    universeToken = await universeTokenFactory.deploy(metahub.address);
    // Initialize Metahub.
    await wait(metahub.initialize(warperPresetFactory.address, universeToken.address));
  });

  it('returns the warper preset factory address', async () => {
    await expect(metahub.warperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
  });

  it('can create universe', async () => {
    const universeName = 'Universe One';
    const universeId = 1;
    await expect(metahub.createUniverse(universeName))
      .to.emit(metahub, 'UniverseCreated')
      .withArgs(universeId, universeName);
    await expect(universeToken.universeName(universeId)).to.eventually.eq(universeName);
  });

  describe('When Universe is created', () => {
    let universeId: BigNumber;

    beforeEach(async () => {
      universeId = await createUniverse(metahub, 'IQ Universe');
    });

    it('allows to deploy a warper from preset', async () => {
      const warperAddress = await deployWarper(metahub, universeId, oNFT.address, warperPresetId);
      // Use oNFT interface with warper address.
      const warper = erc721Factory.attach(warperAddress);
      await expect(warper.name()).to.eventually.eq('Test ERC721');
      await expect(warper.symbol()).to.eventually.eq('ONFT');
    });

    it('verifies universe ownership upon warper deployment', async () => {
      await expect(
        metahub.connect(stranger).deployWarper(universeId, oNFT.address, warperPresetId),
      ).to.be.revertedWithError('CallerIsNotUniverseOwner');
    });

    describe('When warpers are deployed & registered', () => {
      let warperAddress1: string;
      let warperAddress2: string;
      beforeEach(async () => {
        warperAddress1 = await deployWarper(metahub, universeId, oNFT.address, warperPresetId);
        warperAddress2 = await deployWarper(metahub, universeId, oNFT.address, warperPresetId);
      });

      it('returns a list of warpers for universe', async () => {
        await expect(metahub.universeWarpers(universeId)).to.eventually.deep.eq([warperAddress1, warperAddress2]);
      });

      it('returns a list of warpers for original asset', async () => {
        await expect(metahub.assetWarpers(oNFT.address)).to.eventually.deep.eq([warperAddress1, warperAddress2]);
      });
    });
  });

  describe('Upgradeability', () => {
    it('forbids unauthorized upgrade', async () => {
      const [stranger] = await ethers.getUnnamedSigners();
      await expect(upgrades.upgradeProxy(metahub, new MetahubV2Mock__factory(stranger))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('allows owner to upgrade', async () => {
      const metahubV2 = (await upgrades.upgradeProxy(metahub, new MetahubV2Mock__factory(deployer))) as MetahubV2Mock;
      await expect(metahubV2.address).to.eq(metahub.address);
      await expect(metahubV2.version()).to.eventually.eq('V2');
      await expect(metahubV2.warperPresetFactory()).to.eventually.eq(await metahub.warperPresetFactory());
    });
  });
});
