import { useEffect, useState } from "react";
import api from "./api/axios";
import { DEFAULT_USER_ID } from "./constants/User";
import "./Tasks.css";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

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

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showErrorMessage = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    const title = newTaskTitle.trim();
    if (!title) {
      showErrorMessage("Task title cannot be empty");
      return;
    }

    if (title.length > 200) {
      showErrorMessage("Task title must be 200 characters or less");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await api.post("/tasks", {
        Title: title, // PascalCase
        IsDone: false,
        UserId: DEFAULT_USER_ID, // PascalCase
      });

      setTasks([...tasks, response.data]);
      setNewTaskTitle("");
      showSuccessMessage("Task created successfully!");
    } catch (err) {
      let errorMsg = "Failed to create task";
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
        if (err.response.data.errors) {
          errorMsg += ": " + err.response.data.errors.join(", ");
        }
      } else if (err.response?.data?.errors) {
        errorMsg = "Validation failed: " + err.response.data.errors.join(", ");
      }
      showErrorMessage(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTask = async (task) => {
    try {
      setTogglingId(task.id);
      setError(null);

      const response = await api.put(`/tasks/${task.id}`, {
        title: task.title,
        isDone: !task.isDone,
        userId: task.userId,
      });

      setTasks(tasks.map((t) => (t.id === task.id ? response.data : t)));
      showSuccessMessage(
        `Task marked as ${!task.isDone ? "completed" : "pending"}!`
      );
    } catch (err) {
      let errorMsg = "Failed to update task";
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      showErrorMessage(errorMsg);
    } finally {
      setTogglingId(null);
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleUpdateTask = async (taskId) => {
    const title = editingTitle.trim();
    if (!title) {
      showErrorMessage("Task title cannot be empty");
      return;
    }

    if (title.length > 200) {
      showErrorMessage("Task title must be 200 characters or less");
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      setError(null);

      const response = await api.put(`/tasks/${taskId}`, {
        title: title,
        isDone: task.isDone,
        userId: task.userId,
      });

      setTasks(tasks.map((t) => (t.id === taskId ? response.data : t)));
      setEditingId(null);
      setEditingTitle("");
      showSuccessMessage("Task updated successfully!");
    } catch (err) {
      let errorMsg = "Failed to update task";
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
        if (err.response.data.errors) {
          errorMsg += ": " + err.response.data.errors.join(", ");
        }
      }
      showErrorMessage(errorMsg);
    }
  };

  const handleDeleteClick = (taskId) => {
    setDeletingId(taskId);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      setError(null);
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
      setDeletingId(null);
      showSuccessMessage("Task deleted successfully!");
    } catch (err) {
      let errorMsg = "Failed to delete task";
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      showErrorMessage(errorMsg);
      setDeletingId(null);
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
  if (error && (!tasks || tasks.length === 0)) {
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

  return (
    <div className="tasks-container">
      <h2>Tasks</h2>

      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button
            className="close-error"
            onClick={() => setError(null)}
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleCreateTask} className="create-task-form">
        <div className="form-group">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="task-input"
            maxLength={200}
            disabled={isCreating}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCreating || !newTaskTitle.trim()}
          >
            {isCreating ? "Creating..." : "Add Task"}
          </button>
        </div>
        {newTaskTitle.length > 0 && (
          <div className="char-count">{newTaskTitle.length}/200 characters</div>
        )}
      </form>

      {/* Tasks List */}
      {!tasks || tasks.length === 0 ? (
        <div className="empty-container">
          <p>No tasks found. Create your first task to get started!</p>
        </div>
      ) : (
        <ul className="tasks-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              {editingId === task.id ? (
                <div className="task-edit-form">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="task-edit-input"
                    maxLength={200}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateTask(task.id);
                      } else if (e.key === "Escape") {
                        cancelEditing();
                      }
                    }}
                  />
                  <div className="task-edit-actions">
                    <button
                      onClick={() => handleUpdateTask(task.id)}
                      className="btn btn-save"
                      disabled={!editingTitle.trim()}
                    >
                      Save
                    </button>
                    <button onClick={cancelEditing} className="btn btn-cancel">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="task-content">
                    <span
                      className={
                        task.isDone ? "task-completed" : "task-pending"
                      }
                    >
                      {task.title}
                    </span>
                    <span className="task-status">
                      {task.isDone ? "✅" : "❌"}
                    </span>
                  </div>
                  <div className="task-actions">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="btn btn-toggle"
                      disabled={togglingId === task.id}
                      title={task.isDone ? "Mark as pending" : "Mark as done"}
                    >
                      {togglingId === task.id ? "..." : task.isDone ? "↩" : "✓"}
                    </button>
                    <button
                      onClick={() => startEditing(task)}
                      className="btn btn-edit"
                      title="Edit task"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(task.id)}
                      className="btn btn-delete"
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}

              {deletingId === task.id && (
                <div className="delete-confirmation-overlay">
                  <div className="delete-confirmation-dialog">
                    <h3>Confirm Delete</h3>
                    <p>Are you sure you want to delete "{task.title}"?</p>
                    <p className="warning-text">
                      This action cannot be undone.
                    </p>
                    <div className="confirmation-actions">
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="btn btn-confirm-delete"
                      >
                        Delete
                      </button>
                      <button onClick={cancelDelete} className="btn btn-cancel">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Tasks;
