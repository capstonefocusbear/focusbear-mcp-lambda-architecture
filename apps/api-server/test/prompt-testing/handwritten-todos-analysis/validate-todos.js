module.exports = async function (response, context, artifacts) {
  const result = response.text;
  
  try {
    // Parse the JSON response
    const todos = JSON.parse(result);
    
    // Validate that it's an array
    if (!Array.isArray(todos)) {
      throw new Error('Response is not an array');
    }
    
    // Check number of tasks
    if (context.vars.min_tasks && todos.length < context.vars.min_tasks) {
      throw new Error(`Expected at least ${context.vars.min_tasks} tasks, got ${todos.length}`);
    }
    
    if (context.vars.max_tasks && todos.length > context.vars.max_tasks) {
      throw new Error(`Expected at most ${context.vars.max_tasks} tasks, got ${todos.length}`);
    }
    
    // Validate each task structure
    for (const task of todos) {
      if (!task.title || typeof task.title !== 'string') {
        throw new Error('Each task must have a title string');
      }
      
      if (!task.duration || typeof task.duration !== 'number') {
        throw new Error('Each task must have a duration number');
      }
      
      if (!Array.isArray(task.subtasks)) {
        throw new Error('Each task must have a subtasks array');
      }
      
      // Check duration ranges
      if (context.vars.min_estimated_time && task.duration < context.vars.min_estimated_time) {
        throw new Error(`Task "${task.title}" duration ${task.duration} is below minimum ${context.vars.min_estimated_time}`);
      }
      
      if (context.vars.max_estimated_time && task.duration > context.vars.max_estimated_time) {
        throw new Error(`Task "${task.title}" duration ${task.duration} is above maximum ${context.vars.max_estimated_time}`);
      }
      
      // Validate subtasks structure
      for (const subtask of task.subtasks) {
        if (!subtask.name || typeof subtask.name !== 'string') {
          throw new Error(`Subtask in task "${task.title}" must have a name string`);
        }
        
        if (typeof subtask.is_completed !== 'boolean') {
          throw new Error(`Subtask "${subtask.name}" must have an is_completed boolean`);
        }
      }
    }
    
    // Check expected task names if provided
    if (context.vars.expected_task_names) {
      const actualTaskNames = todos.map(t => t.title);
      for (const expectedName of context.vars.expected_task_names) {
        if (!actualTaskNames.some(name => name.toLowerCase().includes(expectedName.toLowerCase()))) {
          throw new Error(`Expected task name "${expectedName}" not found in actual tasks: ${actualTaskNames.join(', ')}`);
        }
      }
    }
    
    // Check subtask counts if provided
    if (context.vars.min_subtasks || context.vars.max_subtasks) {
      const totalSubtasks = todos.reduce((sum, task) => sum + task.subtasks.length, 0);
      
      if (context.vars.min_subtasks && totalSubtasks < context.vars.min_subtasks) {
        throw new Error(`Expected at least ${context.vars.min_subtasks} subtasks total, got ${totalSubtasks}`);
      }
      
      if (context.vars.max_subtasks && totalSubtasks > context.vars.max_subtasks) {
        throw new Error(`Expected at most ${context.vars.max_subtasks} subtasks total, got ${totalSubtasks}`);
      }
    }
    
    return {
      pass: true,
      score: 1.0,
      reason: `Successfully extracted ${todos.length} tasks with proper ToDo entity structure`
    };
    
  } catch (error) {
    return {
      pass: false,
      score: 0.0,
      reason: `Validation failed: ${error.message}`
    };
  }
};
