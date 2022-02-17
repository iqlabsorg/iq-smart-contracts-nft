import { FakeContract, smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import {
  ERC721Mock__factory,
  Metahub,
  Metahub__factory,
  ERC721PresetConfigurable,
  ERC721PresetConfigurable__factory,
  ERC721Mock,
  ERC721WarperMock__factory,
  ERC721WarperMock,
} from '../../typechain';

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

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return { erc721Warper, metahub, oNFT };
}

type UnitFixtureERC721WarperConfigurable = {
  erc721Warper: ERC721PresetConfigurable;
  metahub: FakeContract<Metahub>;
  oNFT: ERC721Mock;
};

export async function unitFixtureERC721WarperMock(): Promise<UnitFixtureERC721WarperMock> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original asset mock.
  const oNFT = await new ERC721Mock__factory(nftCreator).deploy('Test ERC721', 'ONFT');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy preset.
  const erc721Warper = await new ERC721WarperMock__factory(deployer).deploy();
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  return { erc721Warper, metahub, oNFT };
}

type UnitFixtureERC721WarperMock = {
  erc721Warper: ERC721WarperMock;
  metahub: FakeContract<Metahub>;
  oNFT: ERC721Mock;
};
