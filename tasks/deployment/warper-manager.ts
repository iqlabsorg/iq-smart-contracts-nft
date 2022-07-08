/* eslint-disable multiline-ternary */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { task, types } from 'hardhat/config';
import { WarperManager, WarperManager__factory, IWarperManager__factory, Assets__factory } from '../../typechain';
import { unsafeDeployment } from './unsafe-deployment';

task('deploy:warper-manager', 'Deploy the `WarperManager` contract.')
  .addParam('acl', 'The `ACL` contract address', undefined, types.string)
  .addParam('warperPresetFactory', 'The `WarperPresetFactory` contract address', undefined, types.string)
  .addParam('universeRegistry', 'The `UniverseRegistry` contract address', undefined, types.string)
  .addParam('assetClassRegistry', 'The `AssetClassRegistry` contract address', undefined, types.string)
  .addParam(
    'unsafe',
    'If `true` -- deploy using the deploy plugin (instead of openzeppelin.upgrades)',
    false,
    types.boolean,
  )
  .setAction(
    async (
      {
        warperPresetFactory,
        assetClassRegistry,
        universeRegistry,
        acl,
        unsafe,
      }: {
        acl: string;
        warperPresetFactory: string;
        assetClassRegistry: string;
        universeRegistry: string;
        unsafe: string;
      },
      hre,
    ) => {
      const deployer = await hre.ethers.getNamedSigner('deployer');
      const factory = new WarperManager__factory(deployer);

      // Safe deployment
      const safeDeployment = async () => {
        return (await hre.upgrades.deployProxy(factory, [], {
          kind: 'uups',
          initializer: false,
          unsafeAllow: ['delegatecall', 'external-library-linking'],
        })) as WarperManager;
      };

      // Deploy WarperManager
      const warperManager = await (unsafe
        ? unsafeDeployment(
            factory,
            'WarperManager',
            hre,
            [],
            {},
            {
              // We perform the contract initialization at a later step manually
              execute: undefined,
            },
          )
        : safeDeployment());
      await warperManager.deployed();

      console.log('WarperManager deployed at', warperManager.address);

      // Initializing WarperManager.
      {
        console.log('Initializing warperManager: ');
        const tx = await warperManager.initialize({
          warperPresetFactory,
          assetClassRegistry,
          universeRegistry,
          acl,
        });
        console.log(`tx hash: ${tx.hash} | gas price ${tx.gasPrice?.toString() ?? ''}`);
        await tx.wait();
      }

      console.log('WarperManager', warperManager.address);

      return IWarperManager__factory.connect(warperManager.address, deployer);
    },
  );

export {};
