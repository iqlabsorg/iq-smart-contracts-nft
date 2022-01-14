import chaiAsPromised from 'chai-as-promised';
import { TASK_TEST_SETUP_TEST_ENVIRONMENT } from 'hardhat/builtin-tasks/task-names';
import { subtask } from 'hardhat/config';
import chai, { Assertion } from 'chai';

declare global {
  //eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Chai {
    interface Assertion {
      revertedWithError(error: string, ...expectedArgs: unknown[]): AsyncAssertion;
    }
  }
}

Assertion.addMethod('revertedWithError', function (error: string, ...expectedArgs: unknown[]) {
  const args = expectedArgs.map(p => (typeof p === 'string' ? `"${p}"` : p)).join(', ');
  const reason = `${error}(${args})`;

  return new Assertion(this._obj).to.be.revertedWith(reason);
});

// Override default subtask to add chai plugins
// eslint-disable-next-line require-await
subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (): Promise<void> => {
  chai.use(chaiAsPromised);
});
