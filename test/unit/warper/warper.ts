import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import {
  ERC20Mock__factory,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  ERC721Warper,
  IWarperPreset,
  Metahub,
  Metahub__factory,
  Warper,
} from '../../../typechain';
import { shouldBehaveLikeERC721, shouldBehaveLikeERC721Configurable } from './erc721';
import { shouldBehaveLikeWarper } from './warper.behaviour';

export async function unitFixtureERC721WarperConfigurable() {
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

export function unitTestWarpers(): void {
  describe('ERC721Warper Configurable', function () {
    beforeEach(async function () {
      const { erc721Warper, metahub, oNFT, erc20Token, uninitializedErc721Warper } = await this.loadFixture(
        unitFixtureERC721WarperConfigurable,
      );
      this.mocks.assets.erc721 = oNFT;
      this.mocks.assets.erc20 = erc20Token;
      this.mocks.metahub = metahub;
      this.contracts.presets.erc721Configurable = erc721Warper;
      this.contracts.erc721Warper = erc721Warper as unknown as ERC721Warper;
      this.contracts.warperPreset = uninitializedErc721Warper as unknown as IWarperPreset;
      this.contracts.warper = erc721Warper as unknown as Warper;
    });

    // shouldBehaveLikeERC721(); // todo: turn back on once warpers tests have been fixed
    shouldBehaveLikeWarper();
    shouldBehaveLikeERC721Configurable();
  });
}
