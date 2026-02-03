Based on the following app information, suggest what task the user might be working on.

App Name: {{input_wrapper}}{{app_name}}{{input_wrapper}}
Focus Mode: {{input_wrapper}}{{focus_mode}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the app and determine the most appropriate task:

IMPORTANT: Only select an existing task if there is a STRONG, SPECIFIC connection between the app and the task. Be careful with generic/multi-purpose apps - they should only match tasks that are clearly related to what the app is commonly used for.

Guidelines for matching:
- If the app is clearly specialized for a specific purpose (e.g., Figma for design, Slack for communication, Xcode for iOS development), it MAY match a related task
- If the app is generic/multi-purpose (e.g., Terminal, VS Code, Finder, Notes, Safari), only match an existing task if the task is CLEARLY related to what the app is commonly used for. For example: Terminal CAN match a task like "Coding" or "Development work" since Terminal is commonly used for coding. But Terminal should NOT match "documentation for voice call system" just because you could theoretically write docs in Terminal.
- When in doubt, suggest a NEW task rather than forcing a poor match

Decision process:
1. First, determine if the app is specialized or generic/multi-purpose
2. If an existing task has a STRONG, DIRECT connection to the app (considering what the app is commonly used for), return that task (use its exact task_name and task_id)
3. Otherwise, suggest a new task name that would be appropriate for this app

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
The task_id MUST start with "suggested-".
