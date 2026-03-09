// src/voice.js - CLEAN VERSION (No Standalone Code)
// This module only exports parsing functions for use in main.js

/**
 * Action keywords for voice commands
 */
const ACTIONS = {
    insert: ["insert", "add", "bring", "include", "place", "spawn", "create"],
    delete: ["delete", "remove", "erase"],
    clear: ["clear", "reset"],
    modify: ["modify", "change", "update", "make", "set", "turn"],
    scale: ["scale", "increase", "decrease", "bigger", "smaller", "shrink", "grow", "enlarge", "reduce", "minimize"],
    move: ["move", "shift", "slide"]
};

/**
 * Words that split commands into multiple clauses
 */
const CONNECTORS = ["and", "then", ","];

/**
 * Common words to ignore when parsing object names
 */
const STOP_WORDS = ["a", "an", "the", "my", "some"];

/**
 * Splits transcript into clauses based on connectors
 * Example: "add table and place chair" → ["add table", "place chair"]
 * 
 * @param {string} transcript - The voice recognition transcript
 * @returns {string[]} Array of clause strings
 */
function split(transcript) {
    let clauses = transcript.toLowerCase();

    // Replace connectors with a separator
    CONNECTORS.forEach(connector => {
        clauses = clauses.replaceAll(` ${connector} `, " | ");
    });

    return clauses.split(" | ").filter(clause => clause.trim().length > 0);
}

/**
 * Parses a clause to identify action and object
 * Example: "add red table" → { action: 'insert', object: 'red table' }
 * 
 * @param {string} clause - A single clause from the transcript
 * @returns {{action: string, object: string|null}|null} Parsed action and object, or null if not recognized
 */
function parseClause(clause) {
    const words = clause.trim().split(" ");

    // Look for action keywords
    for (let action in ACTIONS) {
        for (let keyword of ACTIONS[action]) {
            const index = words.indexOf(keyword);

            if (index !== -1) {
                // Get words after the action keyword
                let objectWords = words.slice(index + 1);

                // Filter out stop words and clean up
                objectWords = objectWords.filter(word =>
                    word.length > 0 && !STOP_WORDS.includes(word.toLowerCase())
                );

                // Join remaining words to form object name
                const objectName = objectWords.join(" ");

                return { action, object: objectName };
            }
        }
    }

    return null;
}

/**
 * Enhanced parsing with color and size detection (for future NLP)
 * @param {string} transcript - Full voice command
 * @returns {Array} Array of parsed commands with enhanced metadata
 */
function parseEnhanced(transcript) {
    const clauses = split(transcript);
    const results = [];

    const COLORS = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "brown"];
    const SIZES = ["big", "large", "small", "tiny", "huge"];

    clauses.forEach(clause => {
        const parsed = parseClause(clause);
        if (parsed) {
            // Check for colors and sizes in the object name
            const colors = COLORS.filter(c => clause.includes(c));
            const sizes = SIZES.filter(s => clause.includes(s));

            let position = null;
            let referenceObject = null;

            const PREPOSITIONS = [
                "on top of", "in front of", "next to", "left of", "right of",
                "above", "on", "near", "beside", "behind", "below", "under", "to top of"
            ];
            const positionRegex = new RegExp(`(${PREPOSITIONS.join("|")}) (?:the |a |an )?([a-z0-9 ]+)`, "i");

            const positionMatch = parsed.object.match(positionRegex);
            if (positionMatch) {
                let pos = positionMatch[1].toLowerCase();
                if (pos === "to top of") pos = "above"; // normalize
                position = pos; // e.g. "near", "above"
                referenceObject = positionMatch[2].trim();
                parsed.object = parsed.object.substring(0, positionMatch.index).trim();
            } else {
                // Fallback scan on the whole clause if parsed.object stripped too much
                const clauseMatch = clause.match(positionRegex);
                if (clauseMatch) {
                    let pos = clauseMatch[1].toLowerCase();
                    if (pos === "to top of") pos = "above"; // normalize
                    position = pos;
                    referenceObject = clauseMatch[2].trim();
                }
            }

            if (parsed.action === "scale") {
                if (clause.includes("increase") || clause.includes("bigger") || clause.includes("grow") || clause.includes("enlarge")) {
                    parsed.scaleAction = "increase";
                } else if (clause.includes("decrease") || clause.includes("smaller") || clause.includes("shrink") || clause.includes("reduce") || clause.includes("minimize")) {
                    parsed.scaleAction = "decrease";
                }
            }

            if (parsed.action === "move") {
                const moveDirs = ["left", "right", "up", "down", "forward", "back", "backward", "ahead"];
                for (let dir of moveDirs) {
                    if (clause.includes(dir) && !position) { // Only override if not already captured by prep
                        position = dir === "backward" ? "back" : (dir === "ahead" ? "forward" : dir);
                        break;
                    }
                }
            }

            results.push({
                ...parsed,
                colors: colors.length > 0 ? colors : null,
                sizes: sizes.length > 0 ? sizes : null,
                position,
                referenceObject,
                raw: clause
            });
        }
    });

    return results;
}

// Export only the functions, no DOM manipulation
export {
    split,
    parseClause,
    parseEnhanced,
    ACTIONS,
    CONNECTORS,
    STOP_WORDS
};