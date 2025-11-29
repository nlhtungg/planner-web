// TaskDetail.jsx - Show task details
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTask } from '../services/taskService';

const TaskDetail = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  useEffect(() => {
    getTask(id).then(res => setTask(res.data));
  }, [id]);
  if (!task) return <div>Loading...</div>;
  return (
    <div>
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <p>Status: {task.status}</p>
      <p>Priority: {task.priority}</p>
      <p>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</p>
      <p>Progress: {task.progress}%</p>
    </div>
  );
};
export default TaskDetail;
