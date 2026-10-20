import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientDashboard } from './ClientDashboard';

vi.mock('@/services/dashboard.service', () => ({
  getClientDashboard: vi.fn().mockResolvedValue({
    stats: {
      jobsTotal: 2,
      jobsOpen: 1,
      jobsInProgress: 1,
      jobsClosed: 0,
      jobsCancelled: 0,
      proposalsTotal: 3,
      proposalsPending: 2,
      contractsActive: 1,
      contractsCompleted: 0,
    },
    recentJobs: [],
    recentProposals: [],
    recentContracts: [],
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ClientDashboard', () => {
  it('renders stats from the API', async () => {
    renderWithClient(<ClientDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Pending proposals')).toBeInTheDocument();
      expect(screen.getByText('Active contracts')).toBeInTheDocument();
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
  });
});
