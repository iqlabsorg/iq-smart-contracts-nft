import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  ERC721AssetController__factory,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  IAssetController,
  Metahub,
  Metahub__factory,
  Warper,
} from '../../../../typechain';
import { shouldBehaveAssetController } from './assetController.behaviour';

export async function unitFixtureERC721AssetsController() {
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

  const erc721AssetController = await new ERC721AssetController__factory(deployer).deploy();

  return {
    originalNft: oNFT,
    erc721AssetController,
    warper: erc721Warper as unknown as Warper,
  };
}

export function unitTestAssetController(): void {
  describe('ERC721 Asset controller', function () {
    beforeEach(async function () {
      const { originalNft, erc721AssetController, warper } = await this.loadFixture(unitFixtureERC721AssetsController);

      this.mocks.assets.erc721 = originalNft;
      this.contracts.warper = warper as unknown as Warper;
      this.contracts.assetController = erc721AssetController as unknown as IAssetController;
    });

    shouldBehaveAssetController();
  });
}
