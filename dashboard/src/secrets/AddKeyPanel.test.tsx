import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddKeyPanel } from './AddKeyPanel';

describe('AddKeyPanel', () => {
  it('should render form fields', () => {
    render(<AddKeyPanel onSubmit={() => Promise.resolve()} loading={false} />);

    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key *')).toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Tag')).toBeInTheDocument();
    expect(screen.getByText('Add Key')).toBeInTheDocument();
  });

  it('should have vendor options', () => {
    render(<AddKeyPanel onSubmit={() => Promise.resolve()} loading={false} />);

    const select = screen.getByLabelText('Provider');
    expect(select).toContainHTML('OpenAI');
    expect(select).toContainHTML('Anthropic');
    expect(select).toContainHTML('Venice');
    expect(select).toContainHTML('Google');
  });

  it('should default vendor to openai', () => {
    render(<AddKeyPanel onSubmit={() => Promise.resolve()} loading={false} />);

    const select = screen.getByLabelText('Provider') as HTMLSelectElement;
    expect(select.value).toBe('openai');
  });

  it('should submit with correct values', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } });
    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: 'sk-ant-123' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Test Key' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'prod' } });

    fireEvent.click(screen.getByText('Add Key'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        vendor: 'anthropic',
        secret: 'sk-ant-123',
        label: 'Test Key',
        tag: 'prod',
      });
    });
  });

  it('should show error when API key is empty', async () => {
    const handleSubmit = vi.fn();
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    // Button is disabled when secret is empty, so form shouldn't submit
    expect(screen.getByText('Add Key')).toBeDisabled();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should show error when API key is whitespace', async () => {
    const handleSubmit = vi.fn();
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: '   ' } });
    // Button is disabled when secret is only whitespace (after trim check)
    expect(screen.getByText('Add Key')).toBeDisabled();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should disable form when loading', () => {
    render(<AddKeyPanel onSubmit={() => Promise.resolve()} loading={true} />);

    expect(screen.getByLabelText('Provider')).toBeDisabled();
    expect(screen.getByLabelText('API Key *')).toBeDisabled();
    expect(screen.getByLabelText('Label')).toBeDisabled();
    expect(screen.getByLabelText('Tag')).toBeDisabled();
    expect(screen.getByText('Adding...')).toBeDisabled();
  });

  it('should disable submit button when secret is empty', () => {
    render(<AddKeyPanel onSubmit={() => Promise.resolve()} loading={false} />);

    expect(screen.getByText('Add Key')).toBeDisabled();
  });

  it('should enable submit button when secret is filled', () => {
    render(<AddKeyPanel onSubmit={() => Promise.resolve()} loading={false} />);

    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: 'sk-123' } });

    expect(screen.getByText('Add Key')).not.toBeDisabled();
  });

  it('should clear form after successful submit', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: 'sk-123' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'My Key' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'prod' } });

    fireEvent.click(screen.getByText('Add Key'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });

    const secretInput = screen.getByLabelText('API Key *') as HTMLInputElement;
    const labelInput = screen.getByLabelText('Label') as HTMLInputElement;
    const tagInput = screen.getByLabelText('Tag') as HTMLInputElement;

    expect(secretInput.value).toBe('');
    expect(labelInput.value).toBe('');
    expect(tagInput.value).toBe('');
  });

  it('should show error from submit failure', async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Failed to add key'));
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: 'sk-123' } });
    fireEvent.click(screen.getByText('Add Key'));

    await waitFor(() => {
      expect(screen.getByText('Failed to add key')).toBeInTheDocument();
    });
  });

  it('should trim whitespace from values', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: '  sk-123  ' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: '  My Key  ' } });
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: '  prod  ' } });

    fireEvent.click(screen.getByText('Add Key'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        vendor: 'openai',
        secret: 'sk-123',
        label: 'My Key',
        tag: 'prod',
      });
    });
  });

  it('should not include empty optional fields', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddKeyPanel onSubmit={handleSubmit} loading={false} />);

    fireEvent.change(screen.getByLabelText('API Key *'), { target: { value: 'sk-123' } });
    fireEvent.click(screen.getByText('Add Key'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        vendor: 'openai',
        secret: 'sk-123',
        label: undefined,
        tag: undefined,
      });
    });
  });
});
