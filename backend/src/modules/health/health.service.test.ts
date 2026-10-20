import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', () => ({
  getDatabaseStatus: () => ({ connected: true, readyState: 1 }),
}));

import { getHealthStatus } from './health.service';

describe('getHealthStatus', () => {
  it('returns ok when database is connected', () => {
    const health = getHealthStatus();
    expect(health.status).toBe('ok');
    expect(health.database.connected).toBe(true);
    expect(typeof health.uptime).toBe('number');
    expect(health.timestamp).toBeTruthy();
  });
});
