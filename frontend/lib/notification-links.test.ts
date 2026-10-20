import { describe, expect, it } from 'vitest';
import { notificationHref } from './notification-links';
import type { Notification } from '@/types/notification';

function n(partial: Partial<Notification>): Notification {
  return {
    id: '1',
    type: 'proposal.submitted',
    title: 't',
    message: 'm',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('notificationHref', () => {
  it('routes contracts and client job proposals', () => {
    expect(notificationHref(n({ resourceType: 'contract', resourceId: 'abc' }))).toBe(
      '/contracts/abc',
    );
    expect(
      notificationHref(n({ resourceType: 'job', resourceId: 'job1' }), 'client'),
    ).toBe('/client/jobs/job1/proposals');
    expect(notificationHref(n({ resourceType: 'job', resourceId: 'job1' }), 'freelancer')).toBe(
      '/jobs/job1',
    );
  });

  it('returns null when no resource is present', () => {
    expect(notificationHref(n({}))).toBeNull();
  });
});
