import type { ContractStatus, MilestoneStatus } from '@/types/contract';

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  active: 'blue',
  completed: 'green',
  cancelled: 'default',
};

export const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, string> = {
  pending: 'default',
  submitted: 'processing',
  revision_requested: 'orange',
  approved: 'success',
};

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function toIsoDueDate(dateString: string): string {
  // Ant Design DatePicker / HTML date input → ISO midnight UTC-ish for API
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}
