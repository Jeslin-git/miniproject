// src/utils/voiceManager.js
// Voice recognition and command processing manager

import { split, parseClause } from './voice.js';

export class VoiceManager {
    constructor(options = {}) {
        this.spawnObject = options.spawnObject || (() => {});
        this.deleteObjectByType = options.deleteObjectByType || (() => false);
        this.clearScene = options.clearScene || (() => {});
        this.updateStatus = options.updateStatus || (() => {});

        this.voicePopup = document.getElementById('voice-popup');
        this.cmdDisplay = document.getElementById('command-display');

        this.recognition = null;
        this.isListening = false;

        this.initRecognition();
    }

    initRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log("Speech recognition not supported");
            this.onError("Voice recognition not supported in this browser");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = "en-US";
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        // Auto-restart if it stops unexpectedly
        this.recognition.onend = () => {
            console.log("Speech recognition ended");
            this.isListening = false;
            this.hidePopup();
        };

        // Handle speech recognition results
        this.recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript;
            console.log('Recognized:', transcript);

            this.processTranscript(transcript);
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            console.error("Recognition error:", event.error);
            let errorMsg = "Error occurred";

            switch (event.error) {
                case 'not-allowed':
                    errorMsg = "Microphone permission denied. Please allow microphone access.";
                    break;
                case 'no-speech':
                    errorMsg = "No speech detected. Please try again.";
                    break;
                case 'audio-capture':
                    errorMsg = "No microphone found. Please check your microphone connection.";
                    break;
                default:
                    errorMsg = `Error: ${event.error}`;
            }

            this.showError(errorMsg);
        };
    }

    processTranscript(transcript) {
        const clauses = split(transcript);
        const results = [];

        clauses.forEach(clause => {
            const parsed = parseClause(clause);
            if (parsed) results.push(parsed);
        });

        console.log('Parsed commands:', results);

        // Execute commands directly
        this.executeCommands(results);
    }

    async executeCommands(commands) {
        let processed = false;

        for (const cmd of commands) {
            if (cmd.action === 'insert' && cmd.object) {
                await this.spawnObject(cmd.object);
                this.showMessage(`Placed ${cmd.object.toUpperCase()}`);
                processed = true;
            } else if (cmd.action === 'delete') {
                const success = this.deleteObjectByType(cmd.object);
                if (success) {
                    this.showMessage(`Deleted ${cmd.object}`);
                    processed = true;
                } else {
                    this.showMessage(`No ${cmd.object} found`);
                }
            } else if (cmd.action === 'clear') {
                this.clearScene();
                this.updateStatus("Scene Cleared");
                this.showMessage('Cleared all objects');
                processed = true;
            }
        }

        if (!processed) {
            this.showMessage("Command not recognized");
        }
    }

    startListening() {
        if (!this.recognition) {
            this.showError("Voice recognition not supported");
            return false;
        }

        if (this.isListening) {
            // Stop current session first
            this.recognition.stop();
            setTimeout(() => this.startListening(), 100);
            return true;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            this.showPopup("Listening...");
            return true;
        } catch (error) {
            console.error('Failed to start recognition:', error);
            this.showError("Failed to start listening");
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    isSupported() {
        return this.recognition !== null;
    }

    // UI Helper Methods
    showPopup(message) {
        if (this.voicePopup && this.cmdDisplay) {
            this.voicePopup.classList.remove('hidden');
            this.cmdDisplay.innerText = message;
        }
    }

    hidePopup() {
        if (this.voicePopup) {
            setTimeout(() => this.voicePopup.classList.add('hidden'), 800);
        }
    }

    showMessage(message) {
        if (this.cmdDisplay) {
            this.cmdDisplay.innerText = message;
            setTimeout(() => this.hidePopup(), 2000);
        }
    }

    showError(message) {
        if (this.cmdDisplay && this.voicePopup) {
            this.cmdDisplay.innerText = message;
            this.voicePopup.classList.remove('hidden');
            setTimeout(() => this.voicePopup.classList.add('hidden'), 3000);
        }
    }
}