// ProjectForm.jsx - Create a new project
import React, { useState } from 'react';
import { createProject } from '../services/projectService';

const ProjectForm = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createProject({ name, description });
    if (onCreated) onCreated();
    setName('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Project Name" required />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
      <button type="submit">Create Project</button>
    </form>
  );
};
export default ProjectForm;
