const ACTIONS = {
  insert: ["insert", "add", "bring", "include"],
  delete: ["delete", "remove"],
  clear: ["clear"]
};

const CONNECTORS = ["and", "then", ","];
const STOP_WORDS = ["a", "an", "the", "my"];

function split(transcript) {
    let lowered = transcript.toLowerCase();
    CONNECTORS.forEach(connector => {
        lowered=lowered.replaceAll(` ${connector} `, " | ");
    });
    return lowered.split(" | ");}

    function parseClause(clause) {
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

buttOn.addEventListener(
    'click',()=>{
    if (!isListening) {    
    recognition.start();
    output.textContent="Listening...";
    isListening = true;
}
    else{
        recognition.stop();
        output.textContent="Stopped listening.";
        isListening = false;
    }
});
recognition.onresult=(event)=>{
let action = null;
let object = null;
  const lastResult = event.results[event.results.length - 1];
  const transcript = lastResult[0].transcript;
output.textContent='you said "'+transcript+'"';
console.log(transcript);

  const clauses = split(transcript);
  const results = [];

  clauses.forEach(clause => {
    const parsed = parseClause(clause);
    if (parsed) results.push(parsed);
  });

  console.log(results);

out.textContent = results
  .map(r => `Action: ${r.action}, Object: ${r.object ?? "none"}`)
  .join("\n");
};

recognition.onerror=(event)=>{
    output.textContent="Error occurred in recognition: " + event.error;
    console.error("Error occurred in recognition: " + event.error);
};
recognition.onend = () => {
    console.log("Speech recognition service disconnected");
};
}

else {
    console.log("Speech recognition is not supported in this browser.");
}
