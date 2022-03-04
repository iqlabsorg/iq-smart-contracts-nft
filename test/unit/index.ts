import { baseContext } from '../shared/contexts';
import { unitTestMetahub } from './methaub/Metahub';
import { unitTestWarperPresetFactory } from './warper-preset-factory/WarperPresetFactory';
import { unitTestWarpers } from './warper/warper';
import { unitTestUniverseToken } from './universe-token/UniverseToken';
import { unitTestAssetController, unitTestAssetsLibrary, unitTestERC721AssetVault } from './assets';

baseContext('Unit Tests', function () {
  unitTestWarperPresetFactory();
  unitTestMetahub();
  unitTestWarpers();
  unitTestUniverseToken();
  unitTestAssetsLibrary();
  unitTestERC721AssetVault();
  unitTestAssetController();
});
