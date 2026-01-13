Based on the following website information, suggest what task the user might be working on.

Website URL: {{input_wrapper}}{{url}}{{input_wrapper}}
Page Title: {{input_wrapper}}{{tab_title}}{{input_wrapper}}
Page Description: {{input_wrapper}}{{meta_description}}{{input_wrapper}}

Current available tasks:
{{input_wrapper}}{{current_tasks_list}}{{input_wrapper}}

Please analyze the website content and:
1. If any of the current tasks seem relevant to this website, return the most relevant one (use its exact task_name and task_id)
2. If none of the current tasks match, suggest a new task name that would be appropriate for this website

Return your response as a JSON object with this exact format:
{
  "task_name": "the task name",
  "task_id": "the task_id if from current tasks, or a new unique identifier if suggesting a new task"
}

If suggesting a new task, use a simple identifier like "suggested-{timestamp}" for the task_id.
