import { baseContext } from '../shared/contexts';
import { unitTestMetahub } from './methaub/Metahub';
import { unitTestWarperPresetFactory } from './warper-preset-factory/WarperPresetFactory';
import { unitTestWarpers } from './warper/warper';

baseContext('Unit Tests', function () {
  unitTestWarperPresetFactory();
  unitTestMetahub();
  unitTestWarpers();
});
