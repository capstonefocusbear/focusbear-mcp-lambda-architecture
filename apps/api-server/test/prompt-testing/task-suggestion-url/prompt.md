Based on the following website information, suggest what task the user might be working on.

Website URL: {{input_wrapper}}{{url}}{{input_wrapper}}
Page Title: {{input_wrapper}}{{tab_title}}{{input_wrapper}}
Page Description: {{input_wrapper}}{{meta_description}}{{input_wrapper}}

Current task the user is working on:
{{input_wrapper}}{{current_task_in_todo_player}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the website content and determine the most appropriate task:

IMPORTANT: Only select an existing task if there is a STRONG, SPECIFIC connection between the website content and the task. Be careful with generic websites - they should only match tasks that are clearly related to what the website is commonly used for.

CONTEXT: The system has determined this website is not sufficiently aligned with the current task (alignment score below 70%). However, you should make your own independent assessment. If you genuinely believe the website IS strongly aligned with the current task, you may suggest it. But be careful - only suggest the current task if there is a clear, direct connection (e.g., Slack for "check team comms", GitHub for "coding work").

Guidelines for matching:
- If the website is clearly specialized for a specific purpose (e.g., Jira for project management, Figma for design, a specific documentation page), it MAY match a related task
- If the website is generic/multi-purpose (e.g., Google homepage, Gmail inbox, Twitter feed, Reddit), only match an existing task if the task is CLEARLY related to what the website is commonly used for. For example: GitHub CAN match a task like "Coding" or "Development work" since GitHub is commonly used for coding. But a generic search engine should NOT match "documentation for voice call system" just because you could theoretically search for docs there.
- When in doubt, suggest a NEW task rather than forcing a poor match
- Do NOT suggest the current task unless the website is CLEARLY and DIRECTLY related to it

Decision process:
1. Determine if the website is specialized or generic/multi-purpose
2. If an existing task has a STRONG, DIRECT connection to the website (considering what the website is commonly used for), return that task (use its exact task_name and task_id)
3. Only suggest the current task if the website is clearly and directly related to it (e.g., a team communication tool for a "team comms" task)
4. Otherwise, suggest a new task name that would be appropriate for this website

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
The task_id MUST start with "suggested-".
