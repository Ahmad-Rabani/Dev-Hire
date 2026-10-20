import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContractsList } from './ContractsList';

vi.mock('@/services/contracts.service', () => ({
  listContracts: vi.fn().mockResolvedValue({
    contracts: [],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ContractsList', () => {
  it('shows empty state when there are no contracts', async () => {
    renderWithClient(<ContractsList role="client" />);
    await waitFor(() => {
      expect(screen.getByText(/No contracts yet/i)).toBeInTheDocument();
    });
  });
});
