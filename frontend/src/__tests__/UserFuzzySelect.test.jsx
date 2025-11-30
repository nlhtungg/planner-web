import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserFuzzySelect from '../components/UserFuzzySelect';
import * as workspaceSvc from '../services/workspace';

jest.mock('../services/workspace');

describe('UserFuzzySelect', () => {
  it('debounces and calls search', async () => {
    workspaceSvc.searchMembers.mockResolvedValue([{ _id: 'u1', displayName: 'John Doe', email: 'john@example.com' }]);
    const onSelect = jest.fn();
    render(<UserFuzzySelect workspaceId="ws1" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText('Assign to...');
    fireEvent.change(input, { target: { value: 'jo' } });

    await waitFor(() => expect(workspaceSvc.searchMembers).toHaveBeenCalledWith('ws1', 'jo', 10));
    const nameEl = screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'span' && element.textContent.includes('John Doe');
    });
    expect(nameEl).toBeInTheDocument();
  });

  it('selects an item', async () => {
    workspaceSvc.searchMembers.mockResolvedValue([{ _id: 'u1', displayName: 'John Doe', email: 'john@example.com' }]);
    const onSelect = jest.fn();
    render(<UserFuzzySelect workspaceId="ws1" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText('Assign to...');
    fireEvent.change(input, { target: { value: 'jo' } });
    const nameEl = await waitFor(() => screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'span' && element.textContent.includes('John Doe');
    }));
    fireEvent.mouseDown(nameEl);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ _id: 'u1' }));
  });
});
