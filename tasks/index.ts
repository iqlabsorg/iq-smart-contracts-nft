import { ContractReceipt, ContractTransaction } from 'ethers';
import './deployment/index';
import './misc/interface-printer';

export async function wait(txPromise: Promise<ContractTransaction>): Promise<ContractReceipt> {
  return (await txPromise).wait();
}
