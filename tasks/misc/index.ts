/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import './interface-printer';

/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
import { task } from 'hardhat/config';
import { WarperExtendingPreset__factory, WarperExtendingPreset } from '../../typechain';
import { defaultAbiCoder } from 'ethers/lib/utils';

task('misc:test-warper-preset-extensions', '..').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  // Deploy original NFT
  const original = await hre.run('deploy:mock:ERC721', {
    name: 'OG',
    symbol: 'OG',
  });

  const contractFactory = new WarperExtendingPreset__factory(deployer);
  // defaultAbiCoder.encode(['address', 'address'], [originalAddress, metahubAddress]),
  const initializer = defaultAbiCoder.encode(['address', 'address', 'uint8'], [original.address, deployer.address, 42]);

  const contract = (await hre.upgrades.deployProxy(contractFactory, [initializer], {
    kind: 'uups',
    unsafeAllow: ['delegatecall'],
    initializer: '__initialize(bytes)',
  })) as WarperExtendingPreset;

  console.log(await contract.initValue());
});
