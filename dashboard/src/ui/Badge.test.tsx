import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply default variant class', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default').parentElement;
    expect(badge).toHaveClass('badge--default');
  });

  it('should apply primary variant class', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary').parentElement;
    expect(badge).toHaveClass('badge--primary');
  });

  it('should apply success variant class', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success').parentElement;
    expect(badge).toHaveClass('badge--success');
  });

  it('should apply warning variant class', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning').parentElement;
    expect(badge).toHaveClass('badge--warning');
  });

  it('should apply danger variant class', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText('Danger').parentElement;
    expect(badge).toHaveClass('badge--danger');
  });

  it('should render icon when provided', () => {
    render(<Badge icon={<span data-testid="icon">★</span>}>With Icon</Badge>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = screen.getByText('Custom').parentElement;
    expect(badge).toHaveClass('custom-class');
  });

  it('should wrap text in badge-text span', () => {
    render(<Badge>Text</Badge>);
    const textSpan = screen.getByText('Text');
    expect(textSpan).toHaveClass('badge-text');
  });
});
