import { render, screen } from '@testing-library/react';
import TaskProgressPanel from '../components/TaskProgressPanel';

describe('TaskProgressPanel', () => {
  it('renders manual progress and auto advisory', () => {
    render(<TaskProgressPanel task={{ progress: 40, estimatedHours: 10, loggedHours: 3 }} autoProgress={55} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText(/Auto suggestion: 55%/)).toBeInTheDocument();
    expect(screen.getByText(/3h logged/)).toBeInTheDocument();
    expect(screen.getByText(/10h estimate/)).toBeInTheDocument();
  });
});
