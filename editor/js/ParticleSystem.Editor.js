import { UIPanel, UIRow, UIHorizontalRule, UIText, UIButton, UINumber, UICheckbox, UIColor } from './libs/ui.js';
import { getParticleSystem } from './ParticleSystem.Registery.js';

// Dedicated Particle System Editor Panel
class ParticleSystemEditor {
  constructor(editor) {
    this.editor = editor;
    this.currentSystem = null;
    this.updateFunction = null;
    this.animationId = null;
    this.propertyInputs = {}; // Store references to input elements
    
    this.container = new UIPanel();
    this.container.setClass('ParticleSystemEditor');
    
    this.setupUI();
    this.setupContinuousUpdate();
  }
  
  setupContinuousUpdate() {
    // Create a continuous update loop for particle systems
    const clock = new THREE.Clock();
    
    const animate = () => {
      if (this.currentSystem && this.currentSystem.isPlaying) {
        const delta = clock.getDelta();
        this.currentSystem.update(delta);
        this.editor.signals.spaceChanged.dispatch();
      }
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  setupUI() {
    // Header with drag handle and close button
    const header = document.createElement('div');
    header.style.cursor = 'move';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '8px';
    header.style.backgroundColor = '#333';
    header.style.borderBottom = '1px solid #555';
    
    // Title
    const title = new UIText('Particle System Editor');
    title.setClass('title');
    title.setStyle('color', '#fff');
    title.setStyle('font-weight', 'bold');
    title.setStyle('margin', '0');
    
    const closeBtn = new UIButton('×')
      .setClass('close-button')
      .setStyle('color', '#fff')
      .setStyle('background', 'none')
      .setStyle('border', 'none')
      .setStyle('cursor', 'pointer')
      .setStyle('font-size', '16px')
      .setStyle('padding', '4px 8px')
      .onClick(() => {
        this.container.dom.style.display = 'none';
      });
    
    header.appendChild(title.dom);
    header.appendChild(closeBtn.dom);
    this.container.dom.appendChild(header);
    
    // Store header reference for dragging
    this.dragHandle = header;
    
    // Control buttons
    const controlsRow = new UIRow();
    controlsRow.setStyle('padding', '8px');
    
    const playBtn = new UIButton('Play')
      .setStyle('margin-right', '4px')
      .onClick(() => {
        if (this.currentSystem) {
          this.currentSystem.play();
        }
      });
    
    const pauseBtn = new UIButton('Pause')
      .setStyle('margin-right', '4px')
      .onClick(() => {
        if (this.currentSystem) {
          this.currentSystem.pause();
        }
      });
    
    const stopBtn = new UIButton('Stop')
      .onClick(() => {
        if (this.currentSystem) {
          this.currentSystem.stop();
        }
      });
    
    controlsRow.add(playBtn);
    controlsRow.add(pauseBtn);
    controlsRow.add(stopBtn);
    this.container.add(controlsRow);
    
    // Properties panel
    this.propertiesPanel = new UIPanel();
    this.propertiesPanel.setClass('properties');
    this.propertiesPanel.setStyle('padding', '8px');
    this.propertiesPanel.setStyle('max-height', '400px');
    this.propertiesPanel.setStyle('overflow-y', 'auto');
    this.container.add(this.propertiesPanel);
    
    this.setupPropertiesUI();
  }
  
  setupPropertiesUI() {
    // Clear existing properties
    this.propertiesPanel.clear();
    this.propertyInputs = {};
    
    // Particle Count
    this.addNumberProperty('Particle Count', 'particleCount', 1000, 1, 10000, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateParticleCount(value);
      }
    });
    
    // Max Life
    this.addNumberProperty('Max Life', 'maxLife', 3, 0.1, 10, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('maxLife', value);
      }
    });
    
    // Start Speed
    this.addNumberProperty('Start Speed', 'startSpeed', 5, 0, 50, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('startSpeed', value);
      }
    });
    
    // Speed Variation
    this.addNumberProperty('Speed Variation', 'speedVariation', 5, 0, 20, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('speedVariation', value);
      }
    });
    
    // Gravity
    this.addNumberProperty('Gravity', 'gravity', -9.8, -50, 50, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('gravity', value);
      }
    });
    
    // Size
    this.addNumberProperty('Size', 'size', 0.1, 0.01, 2, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('size', value);
      }
    });
    
    // Opacity
    this.addNumberProperty('Opacity', 'opacity', 0.8, 0, 1, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('opacity', value);
      }
    });
    
    // Color
    this.addColorProperty('Color', 'color', 0x66ccff, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('color', value);
      }
    });
    
    // Emission Rate
    this.addNumberProperty('Emission Rate', 'emissionRate', 1, 0.1, 10000, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('emissionRate', value);
      }
    });
    
    // Spread
    this.addNumberProperty('Spread', 'spread', Math.PI / 6, 0, Math.PI, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('spread', value);
      }
    });
    
    // Burst mode
    this.addBooleanProperty('Burst Mode', 'burst', false, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('burst', value);
      }
    });
    
    // Burst Count
    this.addNumberProperty('Burst Count', 'burstCount', 100, 1, 1000, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('burstCount', value);
      }
    });
    
    // Play on Awake
    this.addBooleanProperty('Play on Awake', 'playOnAwake', true, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('playOnAwake', value);
      }
    });
    
    // Loop
    this.addBooleanProperty('Loop', 'loop', true, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('loop', value);
      }
    });
    
    // Simulation Space
    this.addDropdownProperty('Simulation Space', 'simulationSpace', 'Local', ['Local', 'World'], (value) => {
      if (this.currentSystem) {
        this.currentSystem.setSimulationSpace(value);
      }
    });
  }
  
  addNumberProperty(label, property, defaultValue, min, max, onChange) {
    const row = new UIRow();
    row.setStyle('margin-bottom', '4px');
    row.setStyle('align-items', 'center');
    
    const labelEl = new UIText(label).setWidth('120px');
    labelEl.setStyle('color', '#ccc');
    
    const input = new UINumber(defaultValue).setWidth('80px').setRange(min, max);
    input.setStyle('margin-left', '8px');
    
    // Prevent dragging on input elements
    input.dom.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    input.dom.addEventListener('drag', (e) => {
      e.stopPropagation();
    });
    
    input.onChange(() => {
      onChange(input.getValue());
    });
    
    row.add(labelEl);
    row.add(input);
    this.propertiesPanel.add(row);
    
    // Store reference to input
    this.propertyInputs[property] = input;
  }
  
  addColorProperty(label, property, defaultValue, onChange) {
    const row = new UIRow();
    row.setStyle('margin-bottom', '4px');
    row.setStyle('align-items', 'center');
    
    const labelEl = new UIText(label).setWidth('120px');
    labelEl.setStyle('color', '#ccc');
    
    const input = new UIColor().setHexValue(defaultValue);
    input.setStyle('margin-left', '8px');
    
    // Prevent dragging on input elements
    input.dom.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    input.onChange(() => {
      onChange(input.getHexValue());
    });
    
    row.add(labelEl);
    row.add(input);
    this.propertiesPanel.add(row);
    
    // Store reference to input
    this.propertyInputs[property] = input;
  }
  
  addBooleanProperty(label, property, defaultValue, onChange) {
    const row = new UIRow();
    row.setStyle('margin-bottom', '4px');
    row.setStyle('align-items', 'center');
    
    const labelEl = new UIText(label).setWidth('120px');
    labelEl.setStyle('color', '#ccc');
    
    const input = new UICheckbox(defaultValue);
    input.setStyle('margin-left', '8px');
    
    // Prevent dragging on input elements
    input.dom.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    input.onChange(() => {
      onChange(input.getValue());
    });
    
    row.add(labelEl);
    row.add(input);
    this.propertiesPanel.add(row);
    
    // Store reference to input
    this.propertyInputs[property] = input;
  }
  
  addDropdownProperty(label, property, defaultValue, options, onChange) {
    const row = new UIRow();
    row.setStyle('margin-bottom', '4px');
    row.setStyle('align-items', 'center');
    
    const labelEl = new UIText(label).setWidth('120px');
    labelEl.setStyle('color', '#ccc');
    
    const select = document.createElement('select');
    select.style.marginLeft = '8px';
    select.style.width = '80px';
    select.style.background = '#333';
    select.style.color = '#ccc';
    select.style.border = '1px solid #555';
    select.style.padding = '2px';
    
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      if (option === defaultValue) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });
    
    // Prevent dragging on input elements
    select.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    
    row.add(labelEl);
    row.dom.appendChild(select);
    this.propertiesPanel.add(row);
    
    // Store reference to input
    this.propertyInputs[property] = { getValue: () => select.value, setValue: (value) => select.value = value };
  }
  
  // Update the editor with current system values
  updateEditorValues() {
    if (!this.currentSystem) return;
    
    const config = this.currentSystem.config;
    
    // Update all property inputs with current values
    Object.keys(this.propertyInputs).forEach(property => {
      const input = this.propertyInputs[property];
      const value = config[property];
      
      if (input && value !== undefined) {
        if (typeof input.setValue === 'function') {
          input.setValue(value);
        } else if (typeof input.getValue === 'function') {
          // For custom inputs like dropdown
          if (input.setValue) {
            input.setValue(value);
          }
        } else {
          // For UI elements with setValue method
          if (property === 'color') {
            input.setHexValue(value);
          } else {
            input.setValue(value);
          }
        }
      }
    });
  }
  
  createNewSystem() {
    try {
      const system = new ParticleSystem();
      const object = system.getObject3D();
      object.name = 'ParticleSystem';
      
      // Clean userData
      object.userData = {
        particleSystem: true,
        systemId: Date.now() // Unique ID for tracking
      };
      
      this.editor.execute(new AddObjectCommand(this.editor, object));
      
      // Set as current system
      this.currentSystem = system;
      this.updateEditorValues();
      
      // Auto-play the system
      system.play();
      
      // Select the object
      this.editor.select(object);
      
      console.log('Particle system created and ready!');
      
    } catch (error) {
      console.error('Error creating particle system:', error);
    }
  }
  
  selectSystem(object) {
    // When a particle system object is selected, make it the current system
    if (object?.userData?.particleSystem) {
      const id = object.userData.systemId;
      const system = getParticleSystem(id);
      
      if (system) {
        this.currentSystem = system;
        this.updateEditorValues(); // Update editor with system values
        system.play();
        console.log('Bound to ParticleSystem:', system);
      } else {
        console.warn('No registered system found for ID:', id);
      }
    } else {
      // No particle system selected
      this.currentSystem = null;
    }
  }
  
  getContainer() {
    return this.container;
  }
  
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  showModal() {
    console.log("Showing modal");
    this.container.dom.style.position = 'fixed';
    this.container.dom.style.top = '50%';
    this.container.dom.style.left = '50%';
    this.container.dom.style.transform = 'translate(-50%, -50%)';
    this.container.dom.style.background = '#222';
    this.container.dom.style.border = '1px solid #555';
    this.container.dom.style.borderRadius = '4px';
    this.container.dom.style.padding = '0'; // Remove padding since header has its own
    this.container.dom.style.zIndex = '1000';
    this.container.dom.style.maxHeight = '80vh';
    this.container.dom.style.width = '300px';
    this.container.dom.style.display = 'block';
    this.container.dom.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    
    document.body.appendChild(this.container.dom);
    this.makeDraggable();
  }
  
  makeDraggable() {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    
    // Only make the header draggable
    this.dragHandle.addEventListener('mousedown', (e) => {
      // Don't start dragging if clicking on the close button
      if (e.target.textContent === '×') return;
      
      isDragging = true;
      offsetX = e.clientX - this.container.dom.offsetLeft;
      offsetY = e.clientY - this.container.dom.offsetTop;
      this.dragHandle.style.cursor = 'grabbing';
      
      // Prevent text selection while dragging
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.container.dom.style.left = `${e.clientX - offsetX}px`;
        this.container.dom.style.top = `${e.clientY - offsetY}px`;
        this.container.dom.style.transform = 'none'; // Remove centering transform
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.dragHandle.style.cursor = 'move';
      }
    });
  }
}

export { ParticleSystemEditor };