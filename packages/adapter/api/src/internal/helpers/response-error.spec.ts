import { FetchError, RequiredError, ResponseError } from '@tsumugi-chan/client';
import {
  isConflictError,
  isNotFoundError,
  isResponseErrorWithStatus,
} from '@/internal/helpers/response-error';

function responseError(status: number): ResponseError {
  return new ResponseError(new Response(null, { status }));
}

describe('isResponseErrorWithStatus', () => {
  it('ステータスが一致する ResponseError を検出する', () => {
    expect(isResponseErrorWithStatus(responseError(409), 409)).toBe(true);
  });

  it('ステータスが一致しない場合は false', () => {
    expect(isResponseErrorWithStatus(responseError(500), 409)).toBe(false);
  });

  it('ResponseError 以外は false', () => {
    expect(
      isResponseErrorWithStatus(new FetchError(new Error('offline')), 409),
    ).toBe(false);
    expect(isResponseErrorWithStatus(new RequiredError('cursor'), 409)).toBe(
      false,
    );
    expect(isResponseErrorWithStatus(new Error('boom'), 409)).toBe(false);
    expect(isResponseErrorWithStatus(undefined, 409)).toBe(false);
    expect(isResponseErrorWithStatus('409', 409)).toBe(false);
  });
});

describe('isNotFoundError', () => {
  it('404 のみ true', () => {
    expect(isNotFoundError(responseError(404))).toBe(true);
    expect(isNotFoundError(responseError(409))).toBe(false);
  });
});

describe('isConflictError', () => {
  it('409 のみ true', () => {
    expect(isConflictError(responseError(409))).toBe(true);
    expect(isConflictError(responseError(404))).toBe(false);
  });
});
