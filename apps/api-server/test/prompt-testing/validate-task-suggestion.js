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
    const result = parseOutput(output);
    const { task_name, task_id } = result || {};
    const {
      should_match_existing,
      expected_task_id,
      expected_task_name,
      should_suggest_new,
      existing_task_ids,
      current_tasks_list,
    } = context.vars || {};

    if (!task_name || !task_id) {
      return {
        pass: false,
        score: 0.0,
        reason: `Response missing required fields. Got task_name: ${task_name}, task_id: ${task_id}`,
      };
    }

    if (should_match_existing === true) {
      const tasksById = parseCurrentTasksList(current_tasks_list);
      const matchesId = expected_task_id ? task_id === expected_task_id : existing_task_ids?.includes(task_id);
      const expectedName = expected_task_name || tasksById[expected_task_id] || tasksById[task_id];
      const matchesName = expectedName ? task_name === expectedName : true;
      const pass = Boolean(matchesId && matchesName);

      return {
        pass,
        score: pass ? 1.0 : 0.0,
        reason: pass
          ? `Correctly matched existing task: ${task_name} (${task_id})`
          : `Expected existing task ${expected_task_id || '(any existing id)'}${
              expectedName ? ` with name ${expectedName}` : ''
            }, but got ${task_name} (${task_id})`,
      };
    }

    if (should_suggest_new === true) {
      const hasSuggestedPrefix = typeof task_id === 'string' && task_id.startsWith('suggested-');
      const isNotExisting = !existing_task_ids?.includes(task_id);
      const pass = hasSuggestedPrefix && isNotExisting;

      return {
        pass,
        score: pass ? 1.0 : 0.0,
        reason: pass
          ? `Correctly suggested new task: ${task_name} (${task_id})`
          : `Expected a new task suggestion with id starting "suggested-", but got ${task_name} (${task_id})`,
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

function parseOutput(output) {
  if (typeof output === 'object' && output !== null) {
    return output;
  }

  const text = String(output ?? '').trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenceMatch ? fenceMatch[1] : text;

  return JSON.parse(jsonText);
}

function parseCurrentTasksList(raw) {
  if (!raw) return {};
  const lines = String(raw).split('\n');
  const tasksById = {};
  let currentName = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const nameMatch = trimmed.match(/task_name:\s*(.+)$/);
    if (nameMatch) {
      currentName = stripQuotes(nameMatch[1]);
      continue;
    }

    const idMatch = trimmed.match(/task_id:\s*(.+)$/);
    if (idMatch) {
      const id = stripQuotes(idMatch[1]);
      if (currentName && id) {
        tasksById[id] = currentName;
      }
      currentName = null;
    }
  }

  return tasksById;
}

function stripQuotes(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.replace(/^"|"$/g, '');
}

module.exports = validateTaskSuggestion;
module.exports.default = validateTaskSuggestion;
