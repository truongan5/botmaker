import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeyCard } from './KeyCard';
import type { ProxyKey } from '../types';

describe('KeyCard', () => {
  const mockKey: ProxyKey = {
    id: 'abc123def456',
    vendor: 'openai',
    label: 'Production Key',
    tag: 'prod',
    created_at: 1704067200, // 2024-01-01
  };

  it('should render key label', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);
    expect(screen.getByText('Production Key')).toBeInTheDocument();
  });

  it('should show "Unnamed Key" when label is null', () => {
    const keyWithoutLabel: ProxyKey = { ...mockKey, label: null };
    render(<KeyCard keyData={keyWithoutLabel} onDelete={() => {}} />);
    expect(screen.getByText('Unnamed Key')).toBeInTheDocument();
  });

  it('should render tag badge', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);
    expect(screen.getByText('prod')).toBeInTheDocument();
  });

  it('should show DEFAULT badge when tag is null', () => {
    const keyWithoutTag: ProxyKey = { ...mockKey, tag: null };
    render(<KeyCard keyData={keyWithoutTag} onDelete={() => {}} />);
    expect(screen.getByText('DEFAULT')).toBeInTheDocument();
  });

  it('should show masked key ID', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);
    // Should show first 4 and last 4 chars
    expect(screen.getByText('abc1...f456')).toBeInTheDocument();
  });

  it('should show formatted date', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);
    expect(screen.getByText(/Added Jan 1, 2024/)).toBeInTheDocument();
  });

  it('should show delete button', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);
    expect(screen.getByTitle('Delete key')).toBeInTheDocument();
  });

  it('should show confirm state on first delete click', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);

    fireEvent.click(screen.getByTitle('Delete key'));

    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should cancel delete on cancel click', () => {
    render(<KeyCard keyData={mockKey} onDelete={() => {}} />);

    fireEvent.click(screen.getByTitle('Delete key'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    expect(screen.getByTitle('Delete key')).toBeInTheDocument();
  });

  it('should call onDelete on confirm click', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    render(<KeyCard keyData={mockKey} onDelete={handleDelete} />);

    fireEvent.click(screen.getByTitle('Delete key'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith('abc123def456');
    });
  });

  it('should show deleting state', async () => {
    const handleDelete = vi.fn(() => new Promise(() => {})); // Never resolves
    render(<KeyCard keyData={mockKey} onDelete={handleDelete} />);

    fireEvent.click(screen.getByTitle('Delete key'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('should disable buttons while deleting', async () => {
    const handleDelete = vi.fn(() => new Promise(() => {}));
    render(<KeyCard keyData={mockKey} onDelete={handleDelete} />);

    fireEvent.click(screen.getByTitle('Delete key'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Deleting...')).toBeDisabled();
  });

  it('should apply confirm class when in confirm state', () => {
    const { container } = render(<KeyCard keyData={mockKey} onDelete={() => {}} />);

    fireEvent.click(screen.getByTitle('Delete key'));

    expect(container.querySelector('.key-card--confirm')).toBeInTheDocument();
  });

  it('should mask short key ID', () => {
    const shortKey: ProxyKey = { ...mockKey, id: 'short' };
    render(<KeyCard keyData={shortKey} onDelete={() => {}} />);
    expect(screen.getByText('****')).toBeInTheDocument();
  });
});
