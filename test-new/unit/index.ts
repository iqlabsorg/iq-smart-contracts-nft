import { baseContext } from '../shared/contexts';
import { unitTestMetahub } from './methaub/Metahub';
import { unitTestWarperPresetFactory } from './warper-preset-factory/WarperPresetFactory';
import { unitTestWarpers } from './warper/warper';
import { unitTestUniverseToken } from './universe-token/UniverseToken';

baseContext('Unit Tests', function () {
  unitTestWarperPresetFactory();
  unitTestMetahub();
  unitTestWarpers();
  unitTestUniverseToken();
});
