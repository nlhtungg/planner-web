import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBars from '../components/ProgressBars';

describe('ProgressBars', () => {
  test('renders logged fill width based on estimate', () => {
    render(<ProgressBars estimatedHours={10} loggedHours={5} manualProgress={0} autoProgress={50} />);
    const fill = screen.getByTestId('logged-fill');
    expect(fill).toHaveStyle({ width: '50%' });
    expect(screen.getByText(/Logged:/)).toBeInTheDocument();
  });

  test('shows 0% when no estimate', () => {
    render(<ProgressBars estimatedHours={0} loggedHours={5} manualProgress={0} autoProgress={0} />);
    const fill = screen.getByTestId('logged-fill');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  test('caps at 100% and shows over 100% badge', () => {
    render(<ProgressBars estimatedHours={8} loggedHours={10} manualProgress={0} autoProgress={100} />);
    const fill = screen.getByTestId('logged-fill');
    expect(fill).toHaveStyle({ width: '100%' });
    expect(screen.getByText('>100%')).toBeInTheDocument();
  });
});
