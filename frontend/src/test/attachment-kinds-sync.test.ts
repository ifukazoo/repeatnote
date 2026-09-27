import { describe, it, expect } from 'vitest';
import { ATTACHMENT_KINDS, ARTIFACT_SANDBOX } from '../constants';
// サーバーの添付種別レジストリ。片方だけ変更してずれるのを防ぐため、ここで突き合わせる
import { ATTACHMENT_KINDS as SERVER_ATTACHMENT_KINDS } from '../../../server/src/attachments';

describe('添付種別の定義がサーバーと一致している', () => {
  it('種別の一覧と順序が同じ', () => {
    expect(Object.keys(ATTACHMENT_KINDS)).toEqual(Object.keys(SERVER_ATTACHMENT_KINDS));
  });

  it.each(Object.keys(SERVER_ATTACHMENT_KINDS) as (keyof typeof SERVER_ATTACHMENT_KINDS)[])(
    '%s の拡張子と上限が同じ',
    (kind) => {
      const server = SERVER_ATTACHMENT_KINDS[kind];
      const frontend = ATTACHMENT_KINDS[kind];
      expect([...frontend.extensions].sort()).toEqual(Object.keys(server.contentTypes).sort());
      expect(frontend.maxSize).toBe(server.maxSize);
    },
  );

  it('iframe の sandbox 設定が、サーバーが配信時に付ける CSP sandbox と同じ', () => {
    expect(SERVER_ATTACHMENT_KINDS.html.headers['Content-Security-Policy']).toBe(
      `sandbox ${ARTIFACT_SANDBOX}`,
    );
  });
});
