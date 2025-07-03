import { UIPanel, UIRow, UIHorizontalRule, UIText , UIButton,UINumber,UICheckbox,UIColor} from './libs/ui.js';
import { getParticleSystem } from './ParticleSystem.Registery.js';
// Dedicated Particle System Editor Panel
class ParticleSystemEditor {
  constructor(editor) {
    this.editor = editor;
    this.currentSystem = null;
    this.updateFunction = null;
    this.animationId = null;
    
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
        this.editor.signals.sceneGraphChanged.dispatch();
      }
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  setupUI() {
    const header = document.createElement('div');
header.style.cursor = 'move';
header.style.display = 'flex';
header.style.justifyContent = 'space-between';
header.style.alignItems = 'center';
    // Title
    const title = new UIText('Particle System Editor');
title.setClass('title');
title.setStyle('color', '#fff');
title.setStyle('font-weight', 'bold');
title.setStyle('padding', '4px');

const closeBtn = new UIButton('×')
  .setClass('close-button')
  .setStyle('color', '#fff')
  .setStyle('background', 'none')
  .setStyle('border', 'none')
  .setStyle('cursor', 'pointer')
  .setStyle('font-size', '16px')
  .onClick(() => {
    this.container.dom.style.display = 'none';
  });
      
      
      this.container.add(closeBtn);
    // Control buttons
    const controlsRow = new UIRow();
    
    const playBtn = new UIButton('Play').onClick(() => {
      if (this.currentSystem) {
        
        this.currentSystem.play();
      }
    });
    
    const pauseBtn = new UIButton('Pause').onClick(() => {
      if (this.currentSystem) {
        this.currentSystem.pause();
      }
    });
    
    const stopBtn = new UIButton('Stop').onClick(() => {
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
    this.container.add(this.propertiesPanel);
    
    this.setupPropertiesUI();
  }
  
  setupPropertiesUI() {
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
    this.addNumberProperty('Emission Rate', 'emissionRate', 1, 0.1, 100, (value) => {
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
  }
  
  addNumberProperty(label, property, defaultValue, min, max, onChange) {
    const row = new UIRow();
    const labelEl = new UIText(label).setWidth('120px');
    const input = new UINumber(defaultValue).setWidth('80px').setRange(min, max);
    
    input.onChange(() => {
      onChange(input.getValue());
    });
    
    row.add(labelEl);
    row.add(input);
    this.propertiesPanel.add(row);
  }
  
  addColorProperty(label, property, defaultValue, onChange) {
    const row = new UIRow();
    const labelEl = new UIText(label).setWidth('120px');
    const input = new UIColor().setHexValue(defaultValue);
    
    input.onChange(() => {
      onChange(input.getHexValue());
    });
    
    row.add(labelEl);
    row.add(input);
    this.propertiesPanel.add(row);
  }
  
  addBooleanProperty(label, property, defaultValue, onChange) {
    const row = new UIRow();
    const labelEl = new UIText(label).setWidth('120px');
    const input = new UICheckbox(defaultValue);
    
    input.onChange(() => {
      onChange(input.getValue());
    });
    
    row.add(labelEl);
    row.add(input);
    this.propertiesPanel.add(row);
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
            system.play();
            if (system) {
                this.currentSystem = system;
                console.log('Bound to ParticleSystem:', system);
            } else {
                console.warn('No registered system found for ID:', id);
            }
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
  this.container.dom.style.position = 'fixed';
  this.container.dom.style.top = '50%';
  this.container.dom.style.left = '50%';
  this.container.dom.style.transform = 'translate(-50%, -50%)';
  this.container.dom.style.background = '#222';
  this.container.dom.style.border = '1px solid #555';
  this.container.dom.style.padding = '12px';
  this.container.dom.style.zIndex = 1000;
  this.container.dom.style.maxHeight = '80vh';
  this.container.dom.style.overflowY = 'auto';
  this.container.dom.style.display = '';
  document.body.appendChild(this.container.dom);
  this.makeDraggable(this.container.dom);
}
makeDraggable(domElement) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - domElement.offsetLeft;
    offsetY = e.clientY - domElement.offsetTop;
    domElement.style.cursor = 'move';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      domElement.style.left = `${e.clientX - offsetX}px`;
      domElement.style.top = `${e.clientY - offsetY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    domElement.style.cursor = 'default';
  });
}
}
export{ParticleSystemEditor}