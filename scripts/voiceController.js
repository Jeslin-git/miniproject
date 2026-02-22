// voiceController.js
class VoiceController {
  constructor(geminiAPI, { scene, lastPlacedObject, selectedObject, placedObjects, world, placeObject }) {
    this.gemini = geminiAPI;
    this.recognition = null;
    this.isListening = false;
    this.scene = scene;
    this.lastPlacedObject = lastPlacedObject;
    this.selectedObject = selectedObject;
    this.placedObjects = placedObjects;
    this.world = world;
    this.placeObject = placeObject;
    this.setupSpeechRecognition();
  }
  
  setupSpeechRecognition() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Use Chrome!');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    
    // When speech is detected
    this.recognition.onresult = async (event) => {
      const last = event.results.length - 1;
      const voiceInput = event.results[last][0].transcript;
      
      console.log('You said:', voiceInput);
      this.showTranscript(voiceInput);
      
      // Send to Gemini for understanding
      this.showStatus('Understanding...');
      const parsed = await this.gemini.parseCommand(voiceInput);
      
      console.log('Gemini understood:', parsed);
      this.executeCommand(parsed);
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.showStatus('Error: ' + event.error);
    };
  }
  
  startListening() {
    this.recognition.start();
    this.isListening = true;
    this.showStatus('Listening...');
  }
  
  stopListening() {
    this.recognition.stop();
    this.isListening = false;
    this.showStatus('Stopped');
  }
  
  showTranscript(text) {
    document.getElementById('transcript').textContent = `You said: "${text}"`;
  }
  
  showStatus(status) {
    document.getElementById('voice-status').textContent = status;
  }
  
  executeCommand(parsed) {
    if (parsed.error) {
      this.showStatus(`Error: ${parsed.error}`);
      return;
    }
    
    // Route to appropriate handler
    switch(parsed.action) {
      case 'place':
        this.handlePlace(parsed);
        break;
      case 'move':
        this.handleMove(parsed);
        break;
      case 'delete':
        this.handleDelete(parsed);
        break;
      case 'scale':
        this.handleScale(parsed);
        break;
      case 'change_color':
        this.handleColorChange(parsed);
        break;
      default:
        this.showStatus('Unknown action');
    }
  }
  
  handlePlace(parsed) {
    const { object, color, size, quantity, position, arrangement, reference } = parsed;
    
    // Example: Place single object
    if (quantity === 1) {
      placeObject({
        type: object,
        color: this.colorNameToHex(color),
        scale: this.sizeToScale(size),
        position: this.getPlacementPosition(position)
      });
    }
    // Multiple objects with arrangement
    else if (quantity > 1 && arrangement) {
      this.placeMultiple(object, quantity, arrangement, reference);
    }
    
    this.showStatus(`Placed ${quantity} ${color} ${object}(s)`);
  }
  
  handleMove(parsed) {
    // Move last placed object
    const target = parsed.target === 'last' ? lastPlacedObject : selectedObject;
    if (target) {
      const offset = this.directionToVector(parsed.direction);
      target.position.add(offset);
      this.showStatus(`Moved ${parsed.target}`);
    }
  }
  
  directionToVector(directionName) {
    switch (directionName) {
      case 'left': return new THREE.Vector3(-1, 0, 0);
      case 'right': return new THREE.Vector3(1, 0, 0);
      case 'forward': return new THREE.Vector3(0, 0, -1);
      case 'back': return new THREE.Vector3(0, 0, 1);
      case 'up': return new THREE.Vector3(0, 1, 0);
      case 'down': return new THREE.Vector3(0, -1, 0);
      default: return new THREE.Vector3(0, 0, 0);
    }
  }
  
  colorNameToHex(colorName) {
    const colors = {
      'red': 0xFF0000,
      'blue': 0x0000FF,
      'green': 0x00FF00,
      'yellow': 0xFFFF00,
      'purple': 0x800080,
      'orange': 0xFFA500,
      'black': 0x000000,
      'white': 0xFFFFFF,
      'brown': 0x8B4513
    };
    return colors[colorName] || 0xCCCCCC;
  }
  
  sizeToScale(sizeName) {
    const scales = {
      'tiny': 0.3,
      'small': 0.6,
      'medium': 1.0,
      'large': 1.5,
      'huge': 2.5
    };
    return scales[sizeName] || 1.0;
  }
  
  getPlacementPosition(positionName) {
    const camera = scene.getObjectByName('camera');
    const forward = new THREE.Vector3(0, 0, -5);
    forward.applyQuaternion(camera.quaternion);
    
    const offsets = {
      'current': forward,
      'left': forward.clone().add(new THREE.Vector3(-2, 0, 0)),
      'right': forward.clone().add(new THREE.Vector3(2, 0, 0)),
      'forward': forward.clone().add(new THREE.Vector3(0, 0, -2)),
      'back': forward.clone().add(new THREE.Vector3(0, 0, 2))
    };
    
    return camera.position.clone().add(offsets[positionName] || forward);
  }
  
  placeMultiple(object, quantity, arrangement, reference) {
    // Place multiple objects in pattern
    if (arrangement === 'circle') {
      const radius = 3;
      for (let i = 0; i < quantity; i++) {
        const angle = (i / quantity) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        placeObject({
          type: object,
          position: new THREE.Vector3(x, 0, z)
        });
      }
    }
    // Add more arrangements: line, grid, etc.
  }
  
  handleDelete(parsed) {
    // Assuming a `deleteObject` function exists globally or passed via constructor
    // For now, let's assume it deletes the `lastPlacedObject` or `selectedObject`
    const target = parsed.target === 'last' ? lastPlacedObject : selectedObject;
    if (target) {
      scene.remove(target);
      // Also remove from placedObjects array and physics world
      placedObjects = placedObjects.filter(obj => obj !== target);
      if (target.userData.physicsBody) {
        world.removeBody(target.userData.physicsBody);
      }
      if (selectedObject === target) selectedObject = null;
      if (lastPlacedObject === target) lastPlacedObject = null;
      this.showStatus(`Deleted ${parsed.target || 'object'}`);
    }
  }
  
  handleScale(parsed) {
    const target = parsed.target === 'last' ? lastPlacedObject : selectedObject;
    if (target) {
      const scaleFactor = parsed.scale || 1.0; // Default to 1 if no scale provided
      target.scale.multiplyScalar(scaleFactor);
      this.showStatus(`Scaled ${parsed.target || 'object'} by ${scaleFactor}`);
    }
  }
  
  handleColorChange(parsed) {
    const target = parsed.target === 'last' ? lastPlacedObject : selectedObject;
    if (target) {
      const newColor = this.colorNameToHex(parsed.color);
      target.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.setHex) {
          obj.material.setHex(newColor);
        }
      });
      this.showStatus(`Changed ${parsed.target || 'object'} to ${parsed.color}`);
    }
  }
}
