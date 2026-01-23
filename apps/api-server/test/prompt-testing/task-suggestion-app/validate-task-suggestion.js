/**
 * Validates that the task suggestion response correctly identifies whether
 * to use an existing task or suggest a new one.
 *
 * @param {string|object} output - The LLM response to validate
 * @param {object} context - The test context containing variables and configuration
 * @returns {object} - A grading result object
 */
function validateTaskSuggestion(output, context) {
  try {
    const result = typeof output === 'object' ? output : JSON.parse(output.replace(/```json|```/g, '').trim());
    const { task_name, task_id } = result;
    const { should_match_existing, expected_task_id, should_suggest_new } = context.vars;

    if (!task_name || !task_id) {
      return {
        pass: false,
        score: 0.0,
        reason: `Response missing required fields. Got task_name: ${task_name}, task_id: ${task_id}`,
      };
    }

    if (should_match_existing === true) {
      const isExistingTask = task_id === expected_task_id;
      return {
        pass: isExistingTask,
        score: isExistingTask ? 1.0 : 0.0,
        reason: isExistingTask
          ? `Correctly matched existing task: ${task_name} (${task_id})`
          : `Expected to match existing task ${expected_task_id}, but got ${task_id}`,
      };
    }

    if (should_suggest_new === true) {
      const isNewTask = task_id.startsWith('suggested-') || !context.vars.existing_task_ids?.includes(task_id);
      return {
        pass: isNewTask,
        score: isNewTask ? 1.0 : 0.0,
        reason: isNewTask
          ? `Correctly suggested new task: ${task_name} (${task_id})`
          : `Expected a new task suggestion, but matched existing task: ${task_name} (${task_id})`,
      };
    }

    return {
      pass: true,
      score: 1.0,
      reason: `Task suggestion returned: ${task_name} (${task_id})`,
    };
  } catch (error) {
    return {
      pass: false,
      score: 0.0,
      reason: `Error validating: ${error.message}`,
    };
  }
}

module.exports = validateTaskSuggestion;
