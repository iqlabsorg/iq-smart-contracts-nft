import { ContractReceipt, ContractTransaction } from 'ethers';
import './deployment/index';

export async function wait(txPromise: Promise<ContractTransaction>): Promise<ContractReceipt> {
  return (await txPromise).wait();
}
