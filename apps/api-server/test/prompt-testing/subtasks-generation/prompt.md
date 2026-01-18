Break down the following task into smaller steps. Each step should be a JSON object with the format: 
{ "name": "Subtask Name (capitalized and in {{language}})", "is_completed": false }. 
The final output should be: { "task": "{{task}}", "subtasks": [array of subtasks] }.

Please use the following JSON structure without any code block formatting or backticks:

Task: {{input_wrapper}}{{task}}{{input_wrapper}}

JSON output:
