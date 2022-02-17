import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  ERC721Mock__factory,
  ERC721WarperMock,
  ERC721WarperMock__factory,
  Metahub,
  Metahub__factory,
} from '../../typechain';

export async function unitFixtureERC721Warper(): Promise<UnitFixtureERC721Warper> {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // TODO remove oNFT deployments
  // Deploy original asset mock.
  const oNFT = await new ERC721Mock__factory(nftCreator).deploy('Test ERC721', 'ONFT');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy preset.
  const erc721Warper = await new ERC721WarperMock__factory(deployer).deploy();
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  return { erc721Warper };
}

type UnitFixtureERC721Warper = {
  erc721Warper: ERC721WarperMock;
};
