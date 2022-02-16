import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  ERC20Mock,
  ERC721AssetController,
  ERC721AssetController__factory,
  ERC721AssetVaultMock,
  ERC721AssetVaultMock__factory,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  Metahub,
  Metahub__factory,
  MetahubV2Mock,
  MetahubV2Mock__factory,
  UniverseToken,
  UniverseToken__factory,
  WarperPresetFactory,
  WarperPresetFactory__factory,
} from '../../typechain';
import { AssetClass, createUniverse, deployWarper, makeERC721Asset, wait } from '../utils';
import { BigNumber } from 'ethers';

const { formatBytes32String, defaultAbiCoder } = ethers.utils;
const { AddressZero } = ethers.constants;

describe('Metahub', () => {
  const warperPresetId = formatBytes32String('ERC721Basic');
  let deployer: SignerWithAddress;
  let stranger: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let erc721Factory: ERC721Mock__factory;
  let universeToken: UniverseToken;
  let originalAsset: ERC721Mock;
  let warperPresetFactory: WarperPresetFactory;
  let metahub: Metahub;
  let usdc: ERC20Mock;

  before(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');
    [stranger] = await ethers.getUnnamedSigners();

    // Deploy USDC Mock.
    //usdc = await new ERC20Mock__factory(deployer).deploy('USD Coin', 'USDC', 6, formatUnits(1_000_000n, 6));

    // Deploy original NFT
    erc721Factory = new ERC721Mock__factory(nftCreator);
    originalAsset = await erc721Factory.deploy('Test ERC721', 'ONFT');
    await originalAsset.deployed();

    // Mint some NFT to deployer
    await originalAsset.mint(nftCreator.address, 1);
    await originalAsset.mint(nftCreator.address, 2);

    // Deploy warper preset factory
    warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();

    // Deploy and register warper preset
    const warperImpl = await new ERC721PresetConfigurable__factory(deployer).deploy();
    await warperPresetFactory.addPreset(warperPresetId, warperImpl.address);
  });

  beforeEach(async () => {
    // Deploy Metahub
    metahub = (await upgrades.deployProxy(new Metahub__factory(deployer), [warperPresetFactory.address], {
      kind: 'uups',
      initializer: false,
      unsafeAllow: ['delegatecall'],
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
      const warperAddress = await deployWarper(metahub, universeId, originalAsset.address, warperPresetId);
      // Use original asset interface with warper address.
      const warper = erc721Factory.attach(warperAddress);
      await expect(warper.name()).to.eventually.eq('Test ERC721');
      await expect(warper.symbol()).to.eventually.eq('ONFT');
    });

    it('verifies universe ownership upon warper deployment', async () => {
      await expect(
        metahub.connect(stranger).deployWarper(universeId, originalAsset.address, warperPresetId),
      ).to.be.revertedWithError('CallerIsNotUniverseOwner');
    });

    describe('When warpers are deployed & registered', () => {
      let warperAddress1: string;
      let warperAddress2: string;
      beforeEach(async () => {
        warperAddress1 = await deployWarper(metahub, universeId, originalAsset.address, warperPresetId);
        warperAddress2 = await deployWarper(metahub, universeId, originalAsset.address, warperPresetId);
      });

      it('returns a list of warpers for universe', async () => {
        await expect(metahub.universeWarpers(universeId)).to.eventually.deep.eq([warperAddress1, warperAddress2]);
      });

      it('returns a list of warpers for original asset', async () => {
        await expect(metahub.assetWarpers(originalAsset.address)).to.eventually.deep.eq([
          warperAddress1,
          warperAddress2,
        ]);
      });

      describe('Asset Controller Management', () => {
        let erc721controller: ERC721AssetController;
        beforeEach(async () => {
          erc721controller = await new ERC721AssetController__factory(deployer).deploy();
        });

        it('allows to add asset class controller', async () => {
          await expect(metahub.setAssetClassController(AssetClass.ERC721, erc721controller.address))
            .to.emit(metahub, 'AssetClassControllerChanged')
            .withArgs(AssetClass.ERC721, AddressZero, erc721controller.address);
        });
      });

      describe('Listing', () => {
        let erc721Vault: ERC721AssetVaultMock;
        beforeEach(async () => {
          const erc721Controller = await new ERC721AssetController__factory(deployer).deploy();
          erc721Vault = await new ERC721AssetVaultMock__factory(deployer).deploy();
          await metahub.setAssetClassController(AssetClass.ERC721, erc721Controller.address);
          await metahub.setAssetClassVault(AssetClass.ERC721, erc721Vault.address);
        });

        it.skip('prevents listing asset without registered warper', async () => {
          const params = {
            asset: makeERC721Asset('0x2B328CCD2d38ACBF7103b059a8EB94171C68f745', 1), // unregistered asset
            assetId: 1,
            maxLockPeriod: 86400,
            baseRate: 100,
          };

          await expect(metahub.listAsset(params)).to.revertedWithError('AssetHasNoWarpers', params.asset);
        });

        it.skip('emits correct events', async () => {
          const params = {
            asset: makeERC721Asset(originalAsset.address, 1),
            maxLockPeriod: 86400,
            baseRate: 100,
          };

          await expect(metahub.listAsset(params)).to.emit(metahub, 'AssetListed').withArgs(params.asset, 1);
        });

        it('puts listed asset into vault', async () => {
          await originalAsset.connect(nftCreator).approve(metahub.address, 1);
          const params = {
            asset: makeERC721Asset(originalAsset.address, 1),
            maxLockPeriod: 86400,
            baseRate: 100,
          };

          await metahub.connect(nftCreator).listAsset(params);

          await expect(originalAsset.ownerOf(1)).to.eventually.eq(erc721Vault.address);
        });
      });
    });
  });

  describe('Upgradeability', () => {
    it('forbids unauthorized upgrade', async () => {
      const [stranger] = await ethers.getUnnamedSigners();
      await expect(
        upgrades.upgradeProxy(metahub, new MetahubV2Mock__factory(stranger), { unsafeAllow: ['delegatecall'] }),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('allows owner to upgrade', async () => {
      const metahubV2 = (await upgrades.upgradeProxy(metahub, new MetahubV2Mock__factory(deployer), {
        unsafeAllow: ['delegatecall'],
      })) as MetahubV2Mock;
      await expect(metahubV2.address).to.eq(metahub.address);
      await expect(metahubV2.version()).to.eventually.eq('V2');
      await expect(metahubV2.warperPresetFactory()).to.eventually.eq(await metahub.warperPresetFactory());
    });
  });
});
