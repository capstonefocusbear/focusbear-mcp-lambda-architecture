Based on the following app information, suggest what task the user might be working on.

App Name: {{input_wrapper}}{{app_name}}{{input_wrapper}}
Focus Mode: {{input_wrapper}}{{focus_mode}}{{input_wrapper}}

Current task the user is working on (DO NOT suggest this task):
{{input_wrapper}}{{current_task_in_todo_player}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the app and determine the most appropriate task:

CRITICAL RULE: You MUST NOT suggest the current task shown above. The system has already determined that this app is NOT relevant to the current task, so suggesting the same task would be nonsensical. If the current task appears to be the best match, you MUST suggest a NEW task instead.

IMPORTANT: Only select an existing task if there is a STRONG, SPECIFIC connection between the app and the task. Be careful with generic/multi-purpose apps - they should only match tasks that are clearly related to what the app is commonly used for.

Guidelines for matching:
- NEVER suggest the current task (shown above) - it has already been determined to be irrelevant
- If the app is clearly specialized for a specific purpose (e.g., Figma for design, Slack for communication, Xcode for iOS development), it MAY match a related task
- If the app is generic/multi-purpose (e.g., Terminal, VS Code, Finder, Notes, Safari), only match an existing task if the task is CLEARLY related to what the app is commonly used for. For example: Terminal CAN match a task like "Coding" or "Development work" since Terminal is commonly used for coding. But Terminal should NOT match "documentation for voice call system" just because you could theoretically write docs in Terminal.
- When in doubt, suggest a NEW task rather than forcing a poor match

Decision process:
1. First, check if the best matching task is the current task - if so, you MUST suggest a new task instead
2. Determine if the app is specialized or generic/multi-purpose
3. If an existing task (OTHER than the current task) has a STRONG, DIRECT connection to the app (considering what the app is commonly used for), return that task (use its exact task_name and task_id)
4. Otherwise, suggest a new task name that would be appropriate for this app

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
The task_id MUST start with "suggested-".
