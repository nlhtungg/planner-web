// TaskList.test.jsx - TDD for TaskList
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskList from '../pages/TaskList';
import * as taskService from '../services/taskService';
jest.mock('../services/taskService');

describe('TaskList', () => {
  it('renders tasks', async () => {
    taskService.getTasks.mockResolvedValue({ data: [ { _id: '1', title: 'Task 1' } ] });
    render(
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });
});
