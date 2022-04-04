import { shouldBehaveACL } from './acl.behaviour';

export function unitTestACL(): void {
  describe('ACL', function () {
    beforeEach(async function () {
      // NOTE: ACL gets pre-deployed
    });

    shouldBehaveACL();
  });
}
