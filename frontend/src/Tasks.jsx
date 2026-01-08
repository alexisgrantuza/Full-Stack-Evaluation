import { useEffect, useState } from "react";
import api from "./api/axios";
import "./Tasks.css";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  // The reason why I separated the fetchTasks function is to make it more readable and maintainable. so if the logic were inside the useEffect, it would be harder to read and maintain(Testing purposes).

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/tasks");
      // Ensure we always have an array, even if response.data is null/undefined
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        if (status === 404) {
          setError(
            "Tasks endpoint not found. Please check if the API is running."
          );
        } else if (status === 500) {
          setError("Server error occurred. Please try again later.");
        } else if (status >= 400 && status < 500) {
          setError("Invalid request. Please check your connection settings.");
        } else {
          setError(`An error occurred (${status}). Please try again.`);
        }
      } else if (err.request) {
        // Request was made but no response received
        setError(
          "Unable to connect to the server. Please check if the backend is running and your connection."
        );
      } else {
        // Something else happened
        setError("An unexpected error occurred. Please try again.");
      }
      // initialize tasks as empty array on error
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="tasks-container">
        <h2>Tasks</h2>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="tasks-container">
        <h2>Tasks</h2>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button onClick={fetchTasks} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className="tasks-container">
        <h2>Tasks</h2>
        <div className="empty-container">
          <p>No tasks found. Create your first task to get started!</p>
        </div>
      </div>
    );
  }

  // Show tasks list
  return (
    <div className="tasks-container">
      <h2>Tasks</h2>
      <ul className="tasks-list">
        {tasks.map((task) => (
          <li key={task.id} className="task-item">
            <span className={task.isDone ? "task-completed" : "task-pending"}>
              {task.title}
            </span>
            <span className="task-status">{task.isDone ? "✅" : "❌"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Tasks;
