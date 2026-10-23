import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatMoney } from '../../lib/format.ts';
import { Panel, QueryState } from './Panel.tsx';
import { AnimatedNumber, Badge, Button, Monogram, StatBar } from './primitives.tsx';

describe('ui primitives', () => {
  it('keeps the panel title as the region name and marks live panels', () => {
    render(
      <Panel title="Live talks" tone="live">
        <p>Body</p>
      </Panel>,
    );
    const region = screen.getByRole('region', { name: 'Live talks' });
    expect(region).toHaveAttribute('data-tone', 'live');
    expect(screen.getByRole('heading', { level: 2, name: 'Live talks' })).toBeInTheDocument();
  });

  it('announces loading while showing a skeleton', () => {
    render(<QueryState isPending error={null} onRetry={() => undefined} label="the market" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the market…');
  });

  it('includes the time cost in the button name', () => {
    render(<Button cost="4 hours">Submit offer</Button>);
    expect(screen.getByRole('button', { name: 'Submit offer · 4 hours' })).toBeInTheDocument();
  });

  it('renders badges, meters and monograms', () => {
    render(
      <>
        <Badge tone="danger">Breaking</Badge>
        <StatBar value={72} label="Rating" />
        <Monogram name="Jorge Mendes" />
      </>,
    );
    expect(screen.getByText('Breaking')).toHaveAttribute('data-tone', 'danger');
    expect(screen.getByRole('meter', { name: 'Rating' })).toHaveAttribute('aria-valuenow', '72');
    expect(screen.getByText('JM')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the final number immediately when motion is unavailable', () => {
    const { rerender } = render(<AnimatedNumber value={85_000_000} format={formatMoney} />);
    expect(screen.getByText('£85M')).toBeInTheDocument();
    rerender(<AnimatedNumber value={40_000_000} format={formatMoney} />);
    expect(screen.getByText('£40M')).toBeInTheDocument();
  });
});
