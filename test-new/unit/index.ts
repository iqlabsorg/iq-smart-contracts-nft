import { baseContext } from '../shared/contexts';
import { unitTestERC721Warper } from './erc721/ERC721';

baseContext('Unit Tests', function () {
  unitTestERC721Warper();
});
