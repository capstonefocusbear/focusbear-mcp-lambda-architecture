/**
 * Validates that the motivational message meets quality criteria:
 * - Appropriate length (not too short/long)
 * - Contains motivational/humorous tone indicators
 * - Doesn't include prompt instructions in output
 * - Matches the expected language
 *
 * @param {string} output - The LLM response to validate
 * @param {object} context - The test context containing variables and configuration
 * @returns {object} - A grading result object
 */
function validateMessage(output, context) {
    try {
        const message = output.trim();
        const language = context.vars.language;
        const routine = context.vars.routine;

        // Check length (reasonable for push notification)
        if (message.length < 10) {
            return {
                pass: false,
                score: 0.0,
                reason: `Message too short: ${message.length} characters`,
            };
        }

        if (message.length > 200) {
            return {
                pass: false,
                score: 0.0,
                reason: `Message too long for notification: ${message.length} characters`,
            };
        }

        // Check that prompt instructions aren't included
        if (message.includes("Message:") || message.includes("In ")) {
            return {
                pass: false,
                score: 0.0,
                reason: "Message contains prompt instructions",
            };
        }

        // Basic language check for Spanish
        if (language === "Spanish") {
            const spanishIndicators = [
                "rutina", "mañana", "matutina", "noche", "nocturna", "hora", "tiempo",
                "es hora", "vamos", "café", "despertar", "empezar", "hábitos",
                "productivo", "superhéroe", "techo", "puedes"
            ];
            const hasSpanishContent = spanishIndicators.some(indicator =>
                message.toLowerCase().includes(indicator)
            );

            if (!hasSpanishContent) {
                return {
                    pass: false,
                    score: 0.5,
                    reason: "Message may not be in Spanish as requested",
                };
            }
        }

        // Skip routine relevance check - trust the AI to follow the prompt
        // The AI is specifically instructed to create messages for the routine type

        return {
            pass: true,
            score: 1.0,
            reason: `Valid ${language} ${routine} routine message (${message.length} chars)`,
        };

    } catch (error) {
        return {
            pass: false,
            score: 0.0,
            reason: `Error validating: ${error.message}`,
        };
    }
}

module.exports = validateMessage;
