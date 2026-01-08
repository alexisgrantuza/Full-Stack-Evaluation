using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using TaskManager.Models;
using TaskManager.Data;

namespace TaskManager.API
{
    /// Controller for managing tasks
    [Route("tasks")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TasksController> _logger;

        public TasksController(ApplicationDbContext context, ILogger<TasksController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// Get all tasks
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                _logger.LogInformation("Fetching all tasks");
                var tasks = await _context.Tasks.ToListAsync();
                _logger.LogInformation("Successfully retrieved {Count} tasks", tasks.Count);
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching tasks");
                return StatusCode(500, new { message = "An error occurred while retrieving tasks", error = ex.Message });
            }
        }

        /// Get a specific task by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                if (id <= 0)
                {
                    return BadRequest(new { message = "Invalid task ID. ID must be a positive number." });
                }

                _logger.LogInformation("Fetching task with ID {TaskId}", id);
                var task = await _context.Tasks.FindAsync(id);

                if (task == null)
                {
                    _logger.LogWarning("Task with ID {TaskId} not found", id);
                    return NotFound(new { message = $"Task with ID {id} not found" });
                }

                _logger.LogInformation("Successfully retrieved task with ID {TaskId}", id);
                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching task with ID {TaskId}", id);
                return StatusCode(500, new { message = "An error occurred while retrieving the task", error = ex.Message });
            }
        }

        /// Create a new task
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskItem task)
        {
            try
            {
                // Validate model state
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors)
                        .Select(x => x.ErrorMessage)
                        .ToList();

                    _logger.LogWarning("Validation failed for task creation: {Errors}", string.Join(", ", errors));
                    return BadRequest(new { message = "Validation failed", errors = errors });
                }

                // Validate task is not null
                if (task == null)
                {
                    _logger.LogWarning("Attempted to create task with null data");
                    return BadRequest(new { message = "Task data is required" });
                }

                // Validate Title is not empty or whitespace
                if (string.IsNullOrWhiteSpace(task.Title))
                {
                    return BadRequest(new { message = "Title cannot be empty or whitespace" });
                }

                // Validate UserId exists
                var userExists = await _context.Users.AnyAsync(u => u.Id == task.UserId);
                if (!userExists)
                {
                    _logger.LogWarning("Attempted to create task with non-existent UserId {UserId}", task.UserId);
                    return BadRequest(new { message = $"User with ID {task.UserId} does not exist" });
                }

                _logger.LogInformation("Creating new task: {Title} for UserId {UserId}", task.Title, task.UserId);
                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created task with ID {TaskId}", task.Id);
                return CreatedAtAction(nameof(GetById), new { id = task.Id }, task);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error occurred while creating task");
                
                // Handle specific database constraint violations
                if (ex.InnerException?.Message.Contains("foreign key") == true)
                {
                    return BadRequest(new { message = "Invalid UserId. The specified user does not exist." });
                }

                return StatusCode(500, new { message = "An error occurred while creating the task", error = "Database constraint violation" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while creating task");
                return StatusCode(500, new { message = "An error occurred while creating the task", error = ex.Message });
            }
        }

        /// Update an existing task
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskItem updated)
        {
            try
            {
                if (id <= 0)
                {
                    return BadRequest(new { message = "Invalid task ID. ID must be a positive number." });
                }

                // Validate model state
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors)
                        .Select(x => x.ErrorMessage)
                        .ToList();

                    _logger.LogWarning("Validation failed for task update: {Errors}", string.Join(", ", errors));
                    return BadRequest(new { message = "Validation failed", errors = errors });
                }

                // Validate updated task is not null
                if (updated == null)
                {
                    _logger.LogWarning("Attempted to update task with null data");
                    return BadRequest(new { message = "Task data is required" });
                }

                // Validate Title is not empty or whitespace
                if (string.IsNullOrWhiteSpace(updated.Title))
                {
                    return BadRequest(new { message = "Title cannot be empty or whitespace" });
                }

                _logger.LogInformation("Updating task with ID {TaskId}", id);
                var task = await _context.Tasks.FindAsync(id);

                if (task == null)
                {
                    _logger.LogWarning("Task with ID {TaskId} not found for update", id);
                    return NotFound(new { message = $"Task with ID {id} not found" });
                }

                // Validate UserId exists if it's being changed
                if (task.UserId != updated.UserId)
                {
                    var userExists = await _context.Users.AnyAsync(u => u.Id == updated.UserId);
                    if (!userExists)
                    {
                        _logger.LogWarning("Attempted to update task with non-existent UserId {UserId}", updated.UserId);
                        return BadRequest(new { message = $"User with ID {updated.UserId} does not exist" });
                    }
                }

                // Update task properties
                task.Title = updated.Title;
                task.IsDone = updated.IsDone;
                task.UserId = updated.UserId;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated task with ID {TaskId}", id);
                return Ok(task);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error occurred while updating task with ID {TaskId}", id);
                
                // Handle specific database constraint violations
                if (ex.InnerException?.Message.Contains("foreign key") == true)
                {
                    return BadRequest(new { message = "Invalid UserId. The specified user does not exist." });
                }

                return StatusCode(500, new { message = "An error occurred while updating the task", error = "Database constraint violation" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while updating task with ID {TaskId}", id);
                return StatusCode(500, new { message = "An error occurred while updating the task", error = ex.Message });
            }
        }

        /// Delete a task
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                if (id <= 0)
                {
                    return BadRequest(new { message = "Invalid task ID. ID must be a positive number." });
                }

                _logger.LogInformation("Deleting task with ID {TaskId}", id);
                var task = await _context.Tasks.FindAsync(id);

                if (task == null)
                {
                    _logger.LogWarning("Task with ID {TaskId} not found for deletion", id);
                    return NotFound(new { message = $"Task with ID {id} not found" });
                }

                _context.Tasks.Remove(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully deleted task with ID {TaskId}", id);
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error occurred while deleting task with ID {TaskId}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the task", error = "Database constraint violation" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while deleting task with ID {TaskId}", id);
                return StatusCode(500, new { message = "An error occurred while deleting the task", error = ex.Message });
            }
        }
    }
}
