// ProjectList.jsx - List all projects
import React, { useEffect, useState } from 'react';
import { getProjects } from '../services/projectService';
import { Link } from 'react-router-dom';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    getProjects().then(res => setProjects(res.data));
  }, []);
  return (
    <div>
      <h2>Projects</h2>
      <ul>
        {projects.map(project => (
          <li key={project._id}>
            <Link to={`/projects/${project._id}`}>{project.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default ProjectList;
