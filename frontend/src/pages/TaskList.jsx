// TaskList.jsx - List all tasks
import React, { useEffect, useState } from 'react';
import { getTasks } from '../services/taskService';
import { Link } from 'react-router-dom';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    getTasks().then(res => setTasks(res.data));
  }, []);
  return (
    <div>
      <h2>Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task._id}>
            <Link to={`/tasks/${task._id}`}>{task.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default TaskList;
