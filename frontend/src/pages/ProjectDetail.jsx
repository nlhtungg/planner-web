// ProjectDetail.jsx - Show project details
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProject } from '../services/projectService';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  useEffect(() => {
    getProject(id).then(res => setProject(res.data));
  }, [id]);
  if (!project) return <div>Loading...</div>;
  return (
    <div>
      <h2>{project.name}</h2>
      <p>{project.description}</p>
      <h3>Members</h3>
      <ul>
        {project.members.map(m => <li key={m._id}>{m.name || m.email}</li>)}
      </ul>
      <h3>Tasks</h3>
      <ul>
        {project.tasks.map(t => <li key={t._id}>{t.title}</li>)}
      </ul>
    </div>
  );
};
export default ProjectDetail;
