export async function URLSafePrompt({ vars }) {
  return [
    {
      role: 'system',
      content: `Evaluate whether the following website aligns with the user's Focus Mode and provide a JSON response.

                JSON response format:
                {
                  "allowed_probability": number (0 to 1),
                  "reason": string (explain why the website is related or unrelated to Focus Mode)
                }

                Website data (from Focus Bear app):
                  URL: ${vars.url} 
                  Tab Title: ${vars.tabTitle}

                Website data (from scraping):
                  Meta Description: test

                Focus Mode data:
                  Focus Mode:${vars.focusMode}
                  Intention (what the user wants to focus on): ${vars.intention}
                Assessment Criteria:
                 Allow if meta description or tab title relates to the Focus Mode Intention.
                 Allow if URL strongly relates to the Focus Mode or Intention.

                Scoring:
                 Low relevance: allowed_probability < 0.6
                 Moderate relevance: 0.6 <= allowed_probability <= 0.8
                 High relevance: allowed_probability > 0.8
                  
                JSON Response:`,
    },
  ];
}
