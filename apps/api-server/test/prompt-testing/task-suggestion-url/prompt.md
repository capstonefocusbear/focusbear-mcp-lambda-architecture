Based on the following website information, suggest what task the user might be working on.

Website URL: {{input_wrapper}}{{url}}{{input_wrapper}}
Page Title: {{input_wrapper}}{{tab_title}}{{input_wrapper}}
Page Description: {{input_wrapper}}{{meta_description}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the website content and determine the most appropriate task:

IMPORTANT: Only select an existing task if there is a STRONG, SPECIFIC connection between the website content and the task. Generic websites (like search engines, social media homepages, email inboxes, general news sites, etc.) should almost NEVER match existing tasks unless the task explicitly mentions that specific website or activity.

Guidelines for matching:
- If the website is clearly specialized for a specific purpose (e.g., Jira for project management, Figma for design, a specific documentation page), it MAY match a related task
- If the website is generic/multi-purpose (e.g., Google homepage, Gmail inbox, Twitter feed, Reddit), you should suggest a NEW task based on what the user might be doing, NOT pick an existing task
- When in doubt, suggest a NEW task rather than forcing a poor match
- A task about "documentation" does NOT match a generic website just because documentation could theoretically be found there

Decision process:
1. First, determine if the website is specialized or generic/multi-purpose
2. If specialized AND an existing task has a STRONG, DIRECT connection to the website's specific content, return that task (use its exact task_name and task_id)
3. Otherwise, suggest a new task name that would be appropriate for this website

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
