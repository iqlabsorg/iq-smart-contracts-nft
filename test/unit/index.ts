import { baseContext } from '../shared/contexts';
import { unitTestMetahub } from './metahub/metahub';
import { unitTestWarperPresetFactory } from './warper-preset-factory/warper-preset-factory';
import { unitTestWarpers } from './warper/warper';
import { unitTestUniverseToken } from './universe/universe-token/universe-token';
import { unitTestUniverseRegistry } from './universe/universe-registry/universe-registry';
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
