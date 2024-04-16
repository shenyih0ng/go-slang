import { Chapter } from "../../types";
import { getDisplayResult, testFailure } from "../../utils/testing";
import { MUTEX_WITH_DEADLOCK_CODE, NORMAL_MUTEX_OPERATION_CODE } from "./constants/mutex";

describe('Mutex tests', () => {
  const option = { chapter: Chapter.GO_1, native: true }

  test('Mutex with deadlock', async () => {
    // Execute
    const result = await testFailure(MUTEX_WITH_DEADLOCK_CODE, option);
    
    // Verify
    expect(result.parsedErrors).toEqual('all goroutines are asleep - deadlock!')
  });

}
);