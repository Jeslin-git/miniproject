const ACTIONS = {                                   // Defining possible action and their keywords       
  insert: ["insert", "add", "bring", "include"],
  delete: ["delete", "remove"],
  clear: ["clear"]
};

const CONNECTORS = ["and", "then", ","];
const STOP_WORDS = ["a", "an", "the", "my"];

function split(transcript) {                        // Splitting transcript(voice result) into clauses(like and,then) based on connectors
    let lowered = transcript.toLowerCase();
    CONNECTORS.forEach(connector => {
        lowered=lowered.replaceAll(` ${connector} `, " | ");
    });
    return lowered.split(" | ");}

    function parseClause(clause) {                // Parsing each clause to identify action and object
    const words = clause.split(" ");        
    for (let action in ACTIONS){
        for (let keyword of ACTIONS[action]) {
            const index = words.indexOf(keyword);
            if (index !== -1) {
                let objectWords = words.slice(index + 1);
                objectWords = objectWords.filter(
                word => !STOP_WORDS.includes(word));
                const object = objectWords.join(" ") || null;
                return ({ action, object });
            }
        }

    }
    return null;
    }

// Speech Recognition setup
if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    console.log("Speech recognition is supported in this browser.");

    const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition=new SpeechRecognition();
recognition.lang="en-US";
recognition.continuous=true;
recognition.interimResults=true;

const buttOn=document.getElementById("btn");
const output = document.getElementById("output");
const out = document.getElementById("out");
let isListening = false;

buttOn.addEventListener(        // Add event listener for the button
    'click',()=>{
    if (!isListening) {        // Check if listening and start listening
    recognition.start();
    output.textContent="Listening...";
    isListening = true;
}
    else{                       // Stop listening
        recognition.stop();
        output.textContent="Stopped listening.";
        isListening = false;
    }
});
// Handle speech recognition results
recognition.onresult=(event)=>{             
let action = null;
let object = null;
  const lastResult = event.results[event.results.length - 1];
  const transcript = lastResult[0].transcript;
output.textContent='you said "'+transcript+'"'; // Display what user said
console.log(transcript);
// Process the transcript
  const clauses = split(transcript);
  const results = [];

  clauses.forEach(clause => {  // Parse each clause
    const parsed = parseClause(clause);
    if (parsed) results.push(parsed);
  });

  console.log(results);// Log the results action,object pairs

out.textContent = results   // Display the results action,object pairs
  .map(r => `Action: ${r.action}, Object: ${r.object ?? "none"}`)
  .join("\n");
};

recognition.onerror=(event)=>{  // Handle errors
    output.textContent="Error occurred in recognition: " + event.error;
    console.error("Error occurred in recognition: " + event.error);
};
recognition.onend = () => { // Handle end of recognition
    isListening = false;
    output.textContent="Speech recognition service disconnected";
    console.log("Speech recognition service disconnected");
};
}
// If speech recognition is not supported
else {
    console.log("Speech recognition is not supported in this browser.");
}


export { split, parseClause, recognition };