// ProjectList.test.jsx - TDD for ProjectList
import { render, screen, waitFor } from '@testing-library/react';
import ProjectList from '../pages/ProjectList';
import * as projectService from '../services/projectService';
jest.mock('../services/projectService');

describe('ProjectList', () => {
  it('renders projects', async () => {
    projectService.getProjects.mockResolvedValue({ data: [ { _id: '1', name: 'Project 1' } ] });
    render(<ProjectList />);
    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });
  });
});
