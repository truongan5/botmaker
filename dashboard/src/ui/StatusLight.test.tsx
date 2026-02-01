import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusLight } from './StatusLight';

describe('StatusLight', () => {
  it('should render status light', () => {
    render(<StatusLight status="running" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should apply status class for running', () => {
    render(<StatusLight status="running" />);
    expect(screen.getByRole('status')).toHaveClass('status-light--running');
  });

  it('should apply status class for stopped', () => {
    render(<StatusLight status="stopped" />);
    expect(screen.getByRole('status')).toHaveClass('status-light--stopped');
  });

  it('should apply status class for starting', () => {
    render(<StatusLight status="starting" />);
    expect(screen.getByRole('status')).toHaveClass('status-light--starting');
  });

  it('should apply status class for error', () => {
    render(<StatusLight status="error" />);
    expect(screen.getByRole('status')).toHaveClass('status-light--error');
  });

  it('should apply status class for created', () => {
    render(<StatusLight status="created" />);
    expect(screen.getByRole('status')).toHaveClass('status-light--created');
  });

  it('should have aria-label with status name', () => {
    render(<StatusLight status="running" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Running');
  });

  it('should show label when showLabel is true', () => {
    render(<StatusLight status="running" showLabel />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should not show label by default', () => {
    render(<StatusLight status="running" />);
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });

  it('should use custom label when provided', () => {
    render(<StatusLight status="running" showLabel label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('should apply size classes', () => {
    const { rerender, container } = render(<StatusLight status="running" size="sm" />);
    expect(container.querySelector('.status-light-sm')).toBeInTheDocument();

    rerender(<StatusLight status="running" size="md" />);
    expect(container.querySelector('.status-light-md')).toBeInTheDocument();

    rerender(<StatusLight status="running" size="lg" />);
    expect(container.querySelector('.status-light-lg')).toBeInTheDocument();
  });

  it('should use md size by default', () => {
    const { container } = render(<StatusLight status="running" />);
    expect(container.querySelector('.status-light-md')).toBeInTheDocument();
  });
});
