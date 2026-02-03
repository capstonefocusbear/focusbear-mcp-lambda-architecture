Based on the following website information, suggest what task the user might be working on.

Website URL: {{input_wrapper}}{{url}}{{input_wrapper}}
Page Title: {{input_wrapper}}{{tab_title}}{{input_wrapper}}
Page Description: {{input_wrapper}}{{meta_description}}{{input_wrapper}}

Current task the user is working on (DO NOT suggest this task):
{{input_wrapper}}{{current_task_in_todo_player}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the website content and determine the most appropriate task:

CRITICAL RULE: You MUST NOT suggest the current task shown above. The system has already determined that this website is NOT relevant to the current task, so suggesting the same task would be nonsensical. If the current task appears to be the best match, you MUST suggest a NEW task instead.

IMPORTANT: Only select an existing task if there is a STRONG, SPECIFIC connection between the website content and the task. Be careful with generic websites - they should only match tasks that are clearly related to what the website is commonly used for.

Guidelines for matching:
- NEVER suggest the current task (shown above) - it has already been determined to be irrelevant
- If the website is clearly specialized for a specific purpose (e.g., Jira for project management, Figma for design, a specific documentation page), it MAY match a related task
- If the website is generic/multi-purpose (e.g., Google homepage, Gmail inbox, Twitter feed, Reddit), only match an existing task if the task is CLEARLY related to what the website is commonly used for. For example: GitHub CAN match a task like "Coding" or "Development work" since GitHub is commonly used for coding. But a generic search engine should NOT match "documentation for voice call system" just because you could theoretically search for docs there.
- When in doubt, suggest a NEW task rather than forcing a poor match

Decision process:
1. First, check if the best matching task is the current task - if so, you MUST suggest a new task instead
2. Determine if the website is specialized or generic/multi-purpose
3. If an existing task (OTHER than the current task) has a STRONG, DIRECT connection to the website (considering what the website is commonly used for), return that task (use its exact task_name and task_id)
4. Otherwise, suggest a new task name that would be appropriate for this website

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
The task_id MUST start with "suggested-".
