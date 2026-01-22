Based on the following app information, suggest what task the user might be working on.

App Name: {{input_wrapper}}{{app_name}}{{input_wrapper}}
Focus Mode: {{input_wrapper}}{{focus_mode}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the app and:
1. If any of the current tasks seem relevant to this app, return the most relevant one (use its exact task_name and task_id)
2. If none of the current tasks match, suggest a new task name that would be appropriate for this app

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
