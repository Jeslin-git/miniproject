// Voice recognition parsing functions
const ACTIONS = {
  insert: ["insert", "add", "bring", "include", "place"],
  delete: ["delete", "remove"],
  clear: ["clear"]
};

const CONNECTORS = ["and", "then", ","];
const STOP_WORDS = ["a", "an", "the", "my"];

/**
 * Splits transcript into clauses based on connectors
 * @param {string} transcript - The voice recognition transcript
 * @returns {string[]} Array of clause strings
 */
export function split(transcript) {
    let lowered = transcript.toLowerCase();
    CONNECTORS.forEach(connector => {
        lowered = lowered.replaceAll(` ${connector} `, " | ");
    });
    return lowered.split(" | ");
}

/**
 * Parses a clause to identify action and object
 * @param {string} clause - A single clause from the transcript
 * @returns {{action: string, object: string|null}|null} Parsed action and object, or null if not recognized
 */
export function parseClause(clause) {
    const words = clause.split(" ");
    for (let action in ACTIONS) {
        for (let keyword of ACTIONS[action]) {
            const index = words.indexOf(keyword);
            if (index !== -1) {
                let objectWords = words.slice(index + 1);
                objectWords = objectWords.filter(
                    word => !STOP_WORDS.includes(word)
                );
                const object = objectWords.join(" ") || null;
                return { action, object };
            }
        }
    }
    return null;
}