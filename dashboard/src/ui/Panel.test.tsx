import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  it('should render children', () => {
    render(<Panel>Panel Content</Panel>);
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('should apply default variant class', () => {
    const { container } = render(<Panel>Content</Panel>);
    expect(container.querySelector('.panel--default')).toBeInTheDocument();
  });

  it('should apply raised variant class', () => {
    const { container } = render(<Panel variant="raised">Content</Panel>);
    expect(container.querySelector('.panel--raised')).toBeInTheDocument();
  });

  it('should apply inset variant class', () => {
    const { container } = render(<Panel variant="inset">Content</Panel>);
    expect(container.querySelector('.panel--inset')).toBeInTheDocument();
  });

  it('should render header when provided', () => {
    render(<Panel header={<h2>Panel Header</h2>}>Content</Panel>);
    expect(screen.getByText('Panel Header')).toBeInTheDocument();
    expect(screen.getByText('Panel Header').closest('.panel-header')).toBeInTheDocument();
  });

  it('should render footer when provided', () => {
    render(<Panel footer={<button>Save</button>}>Content</Panel>);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Save').closest('.panel-footer')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Panel className="custom-panel">Content</Panel>);
    expect(container.querySelector('.custom-panel')).toBeInTheDocument();
  });

  it('should wrap content in panel-content', () => {
    render(<Panel>Content</Panel>);
    expect(screen.getByText('Content').closest('.panel-content')).toBeInTheDocument();
  });

  it('should apply no-padding class when noPadding is true', () => {
    render(<Panel noPadding>Content</Panel>);
    expect(screen.getByText('Content').closest('.panel-content--no-padding')).toBeInTheDocument();
  });

  it('should not apply no-padding class by default', () => {
    render(<Panel>Content</Panel>);
    expect(screen.getByText('Content').closest('.panel-content')).not.toHaveClass('panel-content--no-padding');
  });
});
