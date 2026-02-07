Based on the following website information, suggest what task the user might be working on.

Website URL: {{input_wrapper}}{{url}}{{input_wrapper}}
Page Title: {{input_wrapper}}{{tab_title}}{{input_wrapper}}
Page Description: {{input_wrapper}}{{meta_description}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the website content and determine the most appropriate task:

IMPORTANT: Only select an existing task if there is a STRONG, SPECIFIC connection between the website content and the task. Be careful with generic websites - they should only match tasks that are clearly related to what the website is commonly used for.

Guidelines for matching:
- If the website is clearly specialized for a specific purpose (e.g., Jira for project management, Figma for design, a specific documentation page), it MAY match a related task
- If the website is generic/multi-purpose (e.g., Google homepage, Gmail inbox, Twitter feed, Reddit), only match an existing task if the task is CLEARLY related to what the website is commonly used for. For example: GitHub CAN match a task like "Coding" or "Development work" since GitHub is commonly used for coding. But a generic search engine should NOT match "documentation for voice call system" just because you could theoretically search for docs there.
- When in doubt, suggest a NEW task rather than forcing a poor match

Decision process:
1. First, determine if the website is specialized or generic/multi-purpose
2. If an existing task has a STRONG, DIRECT connection to the website (considering what the website is commonly used for), return that task (use its exact task_name and task_id)
3. Otherwise, suggest a new task name that would be appropriate for this website

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
The task_id MUST start with "suggested-".
