module.exports = async function (response, context) {
  const result = response.text;

  try {
    const todos = JSON.parse(result);
    if (!Array.isArray(todos)) throw new Error('Response is not an array');

    if (context.vars.min_tasks && todos.length < context.vars.min_tasks) {
      throw new Error(`Expected at least ${context.vars.min_tasks} tasks, got ${todos.length}`);
    }
    if (context.vars.max_tasks && todos.length > context.vars.max_tasks) {
      throw new Error(`Expected at most ${context.vars.max_tasks} tasks, got ${todos.length}`);
    }

    for (const task of todos) {
      if (!task.title || typeof task.title !== 'string') throw new Error('Each task must have a title string');
      if (typeof task.duration !== 'number') throw new Error('Each task must have a duration number');
      if (!Array.isArray(task.subtasks)) throw new Error('Each task must have a subtasks array');
      for (const subtask of task.subtasks) {
        if (!subtask.name || typeof subtask.name !== 'string') throw new Error(`Subtask in task "${task.title}" must have a name string`);
        if (typeof subtask.is_completed !== 'boolean') throw new Error(`Subtask "${subtask.name}" must have an is_completed boolean`);
      }
    }

    return { pass: true, score: 1.0, reason: `Extracted ${todos.length} tasks with valid structure` };
  } catch (error) {
    return { pass: false, score: 0.0, reason: `Validation failed: ${error.message}` };
  }
};


