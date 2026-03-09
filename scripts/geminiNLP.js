// geminiNLP.js
class GeminiNLP {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Updated to Gemini 2.5 Flash as requested by user
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  async parseCommand(voiceInput) {
    const prompt = `
You are an expert 3D scene command interpreter. Your task is to convert complex, natural language descriptions into a structured JSON command list for a 3D editor.

OBJECT MAPPING (CRITICAL):
- "beautiful chair", "elegant chair", "armchair", "comfy chair", "comfortable chair" -> "armchair"
- "office chair", "desk chair", "spinning chair" -> "officechair"
- "chair", "seat" -> "chair"
- "table", "desk", "surface", "office desk" -> "table"
- "sofa", "couch", "comfortable sofa", "comfy sofa", "loveseat" -> "sofa"
- "lamp", "light" -> "lamp"
- "plant", "flower", "tree" -> "plant"
- "car", "vehicle" -> "car"
- "dragon", "monster" -> "dragon"
- "human", "person", "character" -> "human"
- "cube", "box", "square" -> "cube"
- "sphere", "ball", "round" -> "sphere"

ADJECTIVE MAPPING:
- "wooden", "wood" -> material: "wood"
- "metallic", "metal", "steel", "iron" -> material: "metal"
- "plastic" -> material: "plastic"
- "glass" -> material: "glass"
- "red", "blue", "green", "yellow", "purple", "orange", "black", "white", "brown", "pink", "cyan", "magenta" -> color: "[color]"
- "tiny", "small", "little" -> size: "small"
- "big", "large", "huge", "massive" -> size: "large"
- "increase", "bigger", "grow", "enlarge" -> scaleAction: "increase"
- "decrease", "smaller", "shrink", "reduce", "minimize" -> scaleAction: "decrease"

COMMAND PARSING RULES:
1. Identify multiple commands separated by "and", "then", "also", "plus", or punctuation.
2. For each object mentioned, extract ALL its properties (color, material, size, quantity).
3. If no action is specified (e.g., "a red chair"), assume the action is "place".
4. Support natural phrasing: "I want a...", "Can you put...", "Give me...", "Make a...".
5. Ignore filler words like "could", "please", "a", "an", "the".
6. If the user mentions "office", interpret the main components (e.g., table/desk, office chair, computer, lamp, plant).
7. ROOM GENERATION (CRITICAL): If the user asks for a room type (e.g., "living room", "office", "bedroom", "kitchen"), automatically expand it into a list of 3-6 commands placing standard objects for that room.
   - e.g., "living room" -> place sofa, place tv, place table, place plant.
   - e.g., "bedroom" -> place bed, place drawer, place lamp, place carpet.
8. POLYPIZZA FALLBACK: The app now supports the PolyPizza API for dynamic models. Therefore, you are NOT restricted to the default list of objects if the user explicitly asks for something outside of it (e.g., "a comfortable sofa", "a sports car", "a guitar", "a cup of coffee"). You can output ANY object name naturally as the "object" key, and the frontend will attempt to search PolyPizza for it if it's not a default model.

User Input: "${voiceInput}"

Return ONLY a JSON object with this exact structure:
{
  "commands": [
      "action": "place" | "delete" | "clear" | "modify" | "scale" | "move",
      "object": "string (any standard object name or generic search term like 'guitar', 'car', 'lamp', 'current' for selected)",
      "color": "color_name" | null,
      "size": "small" | "medium" | "large" | null,
      "scaleAction": "increase" | "decrease" | null,
      "material": "wood" | "metal" | "plastic" | "glass" | "stone" | null,
      "quantity": number,
      "position": "current" | "left" | "right" | "forward" | "back" | "up" | "down" | "above" | "below" | "near" | "next to",
      "referenceObject": "string (the object to move this relative to, if specified)" | null    }
  ]
}

Example 1: "Create a beautiful red wooden chair and a small blue table"
Output: { "commands": [ { "action": "place", "object": "armchair", "color": "red", "material": "wood", "quantity": 1, "position": "current" }, { "action": "place", "object": "table", "color": "blue", "size": "small", "quantity": 1, "position": "current" } ] }

Example 2: "Can you put a huge metallic dragon in the scene"
Output: { "commands": [ { "action": "place", "object": "dragon", "size": "large", "material": "metal", "quantity": 1, "position": "current" } ] }

Example 3: "Increase the size of the desk"
Output: { "commands": [ { "action": "scale", "object": "table", "scaleAction": "increase", "quantity": 1 } ] }

Example 4: "Move the bed right and then move the chair next to the table"
Output: { "commands": [ { "action": "move", "object": "bed", "position": "right", "quantity": 1 }, { "action": "move", "object": "chair", "position": "near", "referenceObject": "table", "quantity": 1 } ] }
`;

    try {
      console.log('Sending request to Gemini 2.5 Flash...');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                commands: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      action: { type: "STRING", enum: ["place", "delete", "clear", "modify", "scale", "move"] },
                      object: { type: "STRING" },
                      color: { type: "STRING" },
                      size: { type: "STRING", enum: ["small", "medium", "large"] },
                      scaleAction: { type: "STRING", enum: ["increase", "decrease"] },
                      material: { type: "STRING", enum: ["wood", "metal", "plastic", "glass", "stone"] },
                      quantity: { type: "NUMBER" },
                      position: { type: "STRING", enum: ["current", "left", "right", "forward", "back", "up", "down", "above", "below", "near", "next to", "on", "behind", "left of", "right of", "in front of"] },
                      referenceObject: { type: "STRING" }
                    },
                    required: ["action", "object"]
                  }
                }
              },
              required: ["commands"]
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error details:', errorData);

        // Diagnostic: If 404, suggest checking available models
        if (response.status === 404) {
          console.warn('Model not found. Try visiting this URL in your browser to see available models:');
          console.warn(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
        }

        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Gemini raw response:', data);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No text in Gemini response');
      }

      console.log('Extracted text:', text);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed Gemini response:', parsed);
        return parsed;
      }

      console.log('No JSON found, trying fallback extraction...');
      return this.fallbackParse(text);

    } catch (error) {
      console.error('Gemini API error:', error);
      return { error: `Failed to understand command: ${error.message}` };
    }
  }

  fallbackParse(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(' ');

    const result = {
      action: 'place',
      object: 'unknown',
      color: null,
      size: null,
      material: null,
      position: null,
      referenceObject: null
    };

    if (words.includes('create') || words.includes('add') || words.includes('place') || words.includes('spawn') || words.includes('put')) {
      result.action = 'place';
    } else if (words.includes('delete') || words.includes('remove')) {
      result.action = 'delete';
    } else if (words.includes('clear')) {
      result.action = 'clear';
    } else if (words.includes('scale') || words.includes('increase') || words.includes('decrease') || words.includes('bigger') || words.includes('smaller') || words.includes('shrink') || words.includes('grow') || words.includes('reduce') || words.includes('minimize')) {
      result.action = 'scale';
      if (words.includes('increase') || words.includes('bigger') || words.includes('grow') || words.includes('enlarge')) result.scaleAction = 'increase';
      if (words.includes('decrease') || words.includes('smaller') || words.includes('shrink') || words.includes('reduce') || words.includes('minimize')) result.scaleAction = 'decrease';
    } else if (words.includes('move') || words.includes('shift') || words.includes('slide')) {
      result.action = 'move';
      if (words.includes('left')) result.position = 'left';
      if (words.includes('right')) result.position = 'right';
      if (words.includes('up') || words.includes('higher') || words.includes('top')) result.position = 'up';
      if (words.includes('down') || words.includes('lower') || words.includes('bottom')) result.position = 'down';
      if (words.includes('forward') || words.includes('ahead')) result.position = 'forward';
      if (words.includes('back') || words.includes('backward')) result.position = 'back';

      // If none of these generic directions triggered, it might be prepositional (handled below)
    } else if (words.includes('modify') || words.includes('change') || words.includes('make') || words.includes('set')) {
      result.action = 'modify';
    }

    const objectWords = ['chair', 'table', 'sofa', 'bed', 'lamp', 'plant', 'armchair', 'officechair', 'computer', 'tv', 'drawer', 'carpet', 'mattress'];
    for (const obj of objectWords) {
      if (lowerText.includes(obj)) {
        result.object = obj;
        break;
      }
    }

    // Explicit compound matching for fallback
    if (lowerText.includes('desk chair') || lowerText.includes('office chair')) result.object = 'officechair';
    if (lowerText.includes('desk')) result.object = 'table';
    if (lowerText.includes('couch')) result.object = 'sofa';

    const colors = { 'red': 'red', 'blue': 'blue', 'green': 'green', 'yellow': 'yellow', 'black': 'black', 'white': 'white' };
    for (const [colorName, colorValue] of Object.entries(colors)) {
      if (lowerText.includes(colorName)) {
        result.color = colorValue;
      }
    }

    const materials = { 'wood': 'wood', 'metal': 'metal', 'plastic': 'plastic' };
    for (const [matName, matValue] of Object.entries(materials)) {
      if (lowerText.includes(matName) || lowerText.includes('wooden')) {
        result.material = matValue;
      }
    }

    // Check for prepositions handling ("above", "on top of", "near", "next to", etc)
    const PREPOSITIONS = [
      "on top of", "in front of", "next to", "left of", "right of",
      "above", "on", "near", "beside", "behind", "below", "under", "to top of"
    ];
    const positionRegex = new RegExp(`(${PREPOSITIONS.join("|")}) (?:the |a |an )?([a-z ]+)`, "i");

    const positionMatch = lowerText.match(positionRegex);
    if (positionMatch) {
      let pos = positionMatch[1].toLowerCase();
      if (pos === "to top of") pos = "above"; // normalize
      result.position = pos;
      result.referenceObject = positionMatch[2].trim();
    }

    return { commands: [result] };
  }
}

export { GeminiNLP };
