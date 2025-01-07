import { ClineStateService } from '../ClineStateService';
import { firstValueFrom } from 'rxjs';

describe('ClineStateService', () => {
  let stateService: ClineStateService;

  beforeEach(() => {
    stateService = new ClineStateService();
  });

  afterEach(() => {
    stateService.dispose();
  });

  test('should update and track isStreaming state', async () => {
    const isStreamingPromise = firstValueFrom(stateService.isStreaming$);
    stateService.updateIsStreaming(true);
    const isStreaming = await isStreamingPromise;
    expect(isStreaming).toBe(true);
  });

  test('should update and track abort state', async () => {
    const abortPromise = firstValueFrom(stateService.abort$);
    stateService.updateAbort(true);
    const abort = await abortPromise;
    expect(abort).toBe(true);
  });

  test('should increment and reset consecutive auto-approved requests', () => {
    stateService.incrementConsecutiveAutoApprovedRequests();
    stateService.incrementConsecutiveAutoApprovedRequests();
    let state = stateService.getCurrentState();
    expect(state.consecutiveAutoApprovedRequestsCount).toBe(2);

    stateService.resetConsecutiveAutoApprovedRequests();
    state = stateService.getCurrentState();
    expect(state.consecutiveAutoApprovedRequestsCount).toBe(0);
  });

  test('should throw error for invalid state updates', () => {
    expect(() => stateService.updateIsStreaming(null as any)).toThrow('Invalid input');
    expect(() => stateService.updateAbort(undefined as any)).toThrow('Invalid input');
  });
});
