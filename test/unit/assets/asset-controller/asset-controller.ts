import hre from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import {
  ERC721Mock,
  ERC721PresetConfigurable,
  IAssetController,
  IWarper__factory,
  Metahub,
  Metahub__factory,
} from '../../../../typechain';
import { shouldBehaveLikeIAssetController } from './asset-controller.behaviour';

export async function unitFixtureERC721AssetsController() {
  // Deploy original asset mock.
  const oNFT = (await hre.run('deploy:mock:ERC721', {
    name: 'Test ERC721',
    symbol: 'ONFT',
  })) as ERC721Mock;

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy preset.
  const erc721Warper = (await hre.run('deploy:erc721-preset-configurable')) as ERC721PresetConfigurable;
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const erc721AssetController = (await hre.run('deploy:erc721-asset-controller')) as IAssetController;

  return {
    originalNft: oNFT,
    erc721AssetController,
    warper: erc721Warper,
  };
}

export function unitTestAssetController(): void {
  describe('ERC721 Asset controller', function () {
    beforeEach(async function () {
      const { originalNft, erc721AssetController, warper } = await this.loadFixture(unitFixtureERC721AssetsController);

      this.mocks.assets.erc721 = originalNft;
      this.contracts.warper = IWarper__factory.connect(warper.address, warper.signer);
      this.contracts.assetController = erc721AssetController;
    });

    shouldBehaveLikeIAssetController();
  });
}
