import { baseContext } from '../shared/contexts';
import { unitTestMetahub } from './methaub/Metahub';
import { unitTestWarperPresetFactory } from './warper-preset-factory/WarperPresetFactory';
import { unitTestWarpers } from './warper/warper';
import { unitTestUniverseToken } from './universe/universe-token/UniverseToken';
import { unitTestUniverseRegistry } from './universe/universe-registry/UniverseRegistry';
import { unitTestAssetClassRegistry, unitTestAssetController, unitTestAssetVault } from './assets';
import { unitTestACL } from './acl/acl';

baseContext('Unit Tests', function () {
  unitTestWarperPresetFactory();
  unitTestMetahub();
  unitTestWarpers();
  unitTestUniverseToken();
  unitTestUniverseRegistry();
  unitTestAssetVault();
  unitTestAssetController();
  unitTestAssetClassRegistry();
  unitTestACL();
});
