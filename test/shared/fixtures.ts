import { FakeContract, smock } from '@defi-wonderland/smock';
import { defaultAbiCoder, formatBytes32String } from 'ethers/lib/utils';
import hre, { ethers, upgrades } from 'hardhat';
import { wait } from './utils';
import {
  ERC721Mock__factory,
  Metahub,
  Metahub__factory,
  ERC721PresetConfigurable,
  ERC721PresetConfigurable__factory,
  ERC721Mock,
  WarperPresetFactory__factory,
  UniverseToken__factory,
  UniverseToken,
  WarperPresetFactory,
  WarperPresetMock__factory,
  WarperPresetMock,
  ERC20Mock__factory,
  ERC20Mock,
  AssetsMock,
  AssetsMock__factory,
  ERC721AssetVault,
  ERC721AssetVault__factory,
} from '../../typechain';
import { warperPresetId } from './types';

export async function unitFixtureERC721WarperConfigurable(): Promise<UnitFixtureERC721WarperConfigurable> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original asset mock.
  const oNFT = await new ERC721Mock__factory(nftCreator).deploy('Test ERC721', 'ONFT');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy preset.
  const erc721Warper = await new ERC721PresetConfigurable__factory(deployer).deploy();
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const uninitializedErc721Warper = await new ERC721PresetConfigurable__factory(deployer).deploy();

  // Deploy erc20 token
  const erc20Token = await new ERC20Mock__factory(nftCreator).deploy('Random ERC20', 'TST', 18, 1);

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return { erc721Warper, metahub, oNFT, erc20Token, uninitializedErc721Warper };
}

type UnitFixtureERC721WarperConfigurable = {
  erc721Warper: ERC721PresetConfigurable;
  uninitializedErc721Warper: ERC721PresetConfigurable;
  metahub: FakeContract<Metahub>;
  oNFT: ERC721Mock;
  erc20Token: ERC20Mock;
};

export async function unitFixtureMetahub(): Promise<UnitFixtureMetahub> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original NFT
  const erc721Factory = new ERC721Mock__factory(nftCreator);
  const originalAsset = await erc721Factory.deploy('Test ERC721', 'ONFT');
  await originalAsset.deployed();

  // Mint some NFT to deployer
  await originalAsset.mint(nftCreator.address, 1);
  await originalAsset.mint(nftCreator.address, 2);

  // Deploy warper preset factory
  const warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();

  // Deploy and register warper preset
  const warperImpl = await new ERC721PresetConfigurable__factory(deployer).deploy();
  await warperPresetFactory.addPreset(warperPresetId, warperImpl.address);

  // Deploy Metahub
  const metahub = (await upgrades.deployProxy(new Metahub__factory(deployer), [warperPresetFactory.address], {
    kind: 'uups',
    initializer: false,
    unsafeAllow: ['delegatecall'],
  })) as Metahub;

  // Deploy Universe token.
  const universeTokenFactory = new UniverseToken__factory(deployer);
  const universeToken = await universeTokenFactory.deploy(metahub.address);
  // Initialize Metahub.
  await wait(metahub.initialize(warperPresetFactory.address, universeToken.address));

  return {
    universeToken,
    originalAsset,
    warperPresetFactory,
    metahub,
  };
}

type UnitFixtureMetahub = {
  universeToken: UniverseToken;
  originalAsset: ERC721Mock;
  warperPresetFactory: WarperPresetFactory;
  metahub: Metahub;
};

export async function unitFixtureWarperPresetFactory(): Promise<UnitFixtureWarperPresetFactory> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const warperImplFactory = new WarperPresetMock__factory(deployer);
  const warperImplMock1 = await warperImplFactory.deploy();
  const warperImplMock2 = await warperImplFactory.deploy();

  const warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();

  return {
    warperImplMock1,
    warperImplMock2,
    warperPresetFactory,
  };
}

type UnitFixtureWarperPresetFactory = {
  warperImplMock1: WarperPresetMock;
  warperImplMock2: WarperPresetMock;
  warperPresetFactory: WarperPresetFactory;
};

export async function unitFixtureUniverseTokenMock(): Promise<UnitFixtureUniverseTokenFactory> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy Universe token.
  const universeTokenFactory = new UniverseToken__factory(deployer);
  const universeToken = await universeTokenFactory.deploy(metahub.address);

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return {
    universeToken,
    metahub,
  };
}

type UnitFixtureUniverseTokenFactory = {
  universeToken: UniverseToken;
  metahub: FakeContract<Metahub>;
};

export async function unitFixtureAssetsLib(): Promise<UnitFixtureAsetsLib> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const assetsLib = await new AssetsMock__factory(deployer).deploy();

  return { assetsLib };
}

type UnitFixtureAsetsLib = {
  assetsLib: AssetsMock;
};

export async function unitFixtureERC721AssetsVault(): Promise<UnitFixtureERC721AssetsVault> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const operator = await ethers.getNamedSigner('operator');

  const vault = await new ERC721AssetVault__factory(deployer).deploy(operator.address);
  const asset = await new ERC721Mock__factory(deployer).deploy('Test ERC721', 'ONFT');

  return { vault, asset };
}

type UnitFixtureERC721AssetsVault = {
  vault: ERC721AssetVault;
  asset: ERC721Mock;
};
