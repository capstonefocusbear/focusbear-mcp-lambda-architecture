module.exports = async function (response, context, artifacts) {
  try {
    // Clean and parse the response as JSON
    let obj;
    if (typeof response === 'object' && response !== null) {
      obj = response;
    } else if (typeof response === 'string') {
      const cleaned = response.replace(/```json|```/gi, '').trim();
      if (!cleaned || cleaned === 'undefined' || cleaned === 'null') {
        throw new Error('Response is empty or not valid JSON');
      }
      obj = JSON.parse(cleaned);
    } else {
      throw new Error('Response is neither an object nor a string');
    }

    // Validate top-level object with "tasks" array
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.tasks)) {
      throw new Error('Response must be a JSON object with a "tasks" array');
    }

    const todos = obj.tasks;

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
      if (!task.due_date || typeof task.due_date !== 'string') {
        throw new Error('Each task must have a due_date string');
      }
      if (typeof task.perspiration_level !== 'number') {
        throw new Error('Each task must have a perspiration_level number');
      }
      if (typeof task.outcome !== 'number') {
        throw new Error('Each task must have an outcome number');
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
