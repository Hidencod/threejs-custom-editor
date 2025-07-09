import { UIPanel, UIRow, UIHorizontalRule, UIText, UIButton, UINumber, UICheckbox, UIColor } from './libs/ui.js';
import { getParticleSystem } from './ParticleSystem.Registery.js';
import { ParticleSystem } from './ParticleSystem.js';
import { CurveEditor, GradientEditor } from './ParticleSystem.FieldEditors.js';

// Dedicated Particle System Editor Panel with Improved UI
class ParticleSystemEditor {
  constructor(editor) {
    this.editor = editor;
    this.currentSystem = null;
    this.updateFunction = null;
    this.animationId = null;
    this.propertyInputs = {}; // Store references to input elements
    this.curveEditors = {}; // Store curve editors
    this.gradientEditors = {}; // Store gradient editors
    this.collapsedSections = {}; // Track collapsed sections
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
    header.style.padding = '12px 16px';
    header.style.backgroundColor = '#2d2d2d';
    header.style.borderBottom = '1px solid #374151';
    header.style.borderRadius = '6px 6px 0 0';

    // Title with improved styling
    const title = new UIText('Particle System Editor');
    title.setClass('title');
    title.setStyle('color', '#ffffff');
    title.setStyle('font-weight', '600');
    title.setStyle('font-size', '16px');
    title.setStyle('font-family', 'Inter, "Segoe UI", sans-serif');
    title.setStyle('margin', '0');

    const closeBtn = new UIButton('×')
      .setClass('close-button')
      .setStyle('color', '#9ca3af')
      .setStyle('background', 'none')
      .setStyle('border', 'none')
      .setStyle('cursor', 'pointer')
      .setStyle('font-size', '18px')
      .setStyle('padding', '4px 8px')
      .setStyle('border-radius', '4px')
      .setStyle('transition', 'all 0.2s ease')
      .onClick(() => {
        this.container.dom.style.display = 'none';
        document.body.style.overflow = '';
      });

    // Add hover effect to close button
    closeBtn.dom.addEventListener('mouseenter', () => {
      closeBtn.setStyle('color', '#ffffff');
      closeBtn.setStyle('background-color', '#374151');
    });
    closeBtn.dom.addEventListener('mouseleave', () => {
      closeBtn.setStyle('color', '#9ca3af');
      closeBtn.setStyle('background-color', 'transparent');
    });

    header.appendChild(title.dom);
    header.appendChild(closeBtn.dom);
    this.container.dom.appendChild(header);

    // Store header reference for dragging
    this.dragHandle = header;

    // Control buttons with improved styling
    const controlsRow = new UIRow();
    controlsRow.setStyle('padding', '16px');
    controlsRow.setStyle('background-color', '#1a1a1a');
    controlsRow.setStyle('border-bottom', '1px solid #374151');
    controlsRow.setStyle('gap', '8px');
    controlsRow.setStyle('display', 'flex');

    const playBtn = this.createStyledButton('▶ PLAY', '#3b82f6', () => {
      if (this.currentSystem) {
        this.currentSystem.play();
        this.setActiveButton(playBtn);
      }
    });

    const pauseBtn = this.createStyledButton('⏸ PAUSE', '#f59e0b', () => {
      if (this.currentSystem) {
        this.currentSystem.pause();
        this.setActiveButton(pauseBtn);
      }
    });

    const stopBtn = this.createStyledButton('⏹ STOP', '#ef4444', () => {
      if (this.currentSystem) {
        this.currentSystem.stop();
        this.setActiveButton(stopBtn);
      }
    });

    this.controlButtons = [playBtn, pauseBtn, stopBtn];

    controlsRow.add(playBtn);
    controlsRow.add(pauseBtn);
    controlsRow.add(stopBtn);
    this.container.add(controlsRow);

    // Properties panel with improved styling
    this.propertiesPanel = new UIPanel();
    this.propertiesPanel.setClass('properties');
    this.propertiesPanel.setStyle('padding', '0');
    this.propertiesPanel.setStyle('overflow-y', 'auto');
    this.propertiesPanel.setStyle('flex', '1');
    this.propertiesPanel.setStyle('background-color', '#1a1a1a');

    // Wrap panel contents in a scrollable div with custom scrollbar
    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.display = 'flex';
    scrollWrapper.style.flexDirection = 'column';
    scrollWrapper.style.flex = '1';
    scrollWrapper.style.overflowY = 'auto';
    scrollWrapper.style.maxHeight = '100%';
    scrollWrapper.style.minHeight = '0';
    scrollWrapper.style.background = '#1a1a1a';

    // Custom scrollbar styling
    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = `
      .ParticleSystemEditor div::-webkit-scrollbar {
        width: 6px;
      }
      .ParticleSystemEditor div::-webkit-scrollbar-track {
        background: #1a1a1a;
      }
      .ParticleSystemEditor div::-webkit-scrollbar-thumb {
        background: #374151;
        border-radius: 3px;
      }
      .ParticleSystemEditor div::-webkit-scrollbar-thumb:hover {
        background: #4b5563;
      }
    `;
    document.head.appendChild(scrollbarStyle);

    scrollWrapper.appendChild(this.propertiesPanel.dom);
    this.container.dom.appendChild(scrollWrapper);

    this.setupPropertiesUI();
  }

  createStyledButton(text, color, onClick) {
    const btn = new UIButton(text);
    btn.setStyle('background-color', '#2d2d2d');
    btn.setStyle('border', '1px solid #374151');
    btn.setStyle('border-radius', '6px');
    btn.setStyle('color', '#ffffff');
    btn.setStyle('font-size', '12px');
    btn.setStyle('font-weight', '500');
    btn.setStyle('padding', '8px 12px');
    btn.setStyle('cursor', 'pointer');
    btn.setStyle('transition', 'all 0.2s ease');
    btn.setStyle('min-width', '70px');
    btn.setStyle('display', 'flex');
    btn.setStyle('align-items', 'center');
    btn.setStyle('justify-content', 'center');
    btn.setStyle('font-family', 'Inter, "Segoe UI", sans-serif');

    // Add hover effects
    btn.dom.addEventListener('mouseenter', () => {
      btn.setStyle('background-color', '#374151');
      btn.setStyle('border-color', color);
    });
    btn.dom.addEventListener('mouseleave', () => {
      if (!btn.dom.classList.contains('active')) {
        btn.setStyle('background-color', '#2d2d2d');
        btn.setStyle('border-color', '#374151');
      }
    });

    btn.onClick(onClick);
    return btn;
  }

  setActiveButton(activeBtn) {
    this.controlButtons.forEach(btn => {
      btn.dom.classList.remove('active');
      btn.setStyle('background-color', '#2d2d2d');
      btn.setStyle('border-color', '#374151');
    });

    activeBtn.dom.classList.add('active');
    activeBtn.setStyle('background-color', '#3b82f6');
    activeBtn.setStyle('border-color', '#3b82f6');
  }

  createCollapsibleSection(title, content, hasToggle = false, initialToggleState = false, onToggleChange = null) {
  const section = document.createElement('div');
  section.style.borderBottom = '1px solid #374151';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.padding = '16px 20px';
  header.style.backgroundColor = '#2d2d2d';
  header.style.cursor = 'pointer';
  header.style.transition = 'background-color 0.2s ease';
  header.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.margin = '0';
  titleEl.style.fontSize = '14px';
  titleEl.style.fontWeight = '600';
  titleEl.style.color = '#ffffff';

  const leftSide = document.createElement('div');
  leftSide.style.display = 'flex';
  leftSide.style.alignItems = 'center';
  leftSide.style.gap = '10px';

  const rightSide = document.createElement('div');
  rightSide.style.display = 'flex';
  rightSide.style.alignItems = 'center';
  rightSide.style.gap = '10px';

  const expandIcon = document.createElement('span');
  expandIcon.textContent = '▼';
  expandIcon.style.fontSize = '12px';
  expandIcon.style.color = '#9ca3af';
  expandIcon.style.transition = 'transform 0.2s ease';

  let toggleInput = null;
  let toggleLabel = null;
  let toggleThumb = null;

  if (hasToggle) {
    const toggleContainer = document.createElement('div');
    toggleContainer.style.position = 'relative';
    toggleContainer.style.display = 'inline-block';
    toggleContainer.style.width = '44px';
    toggleContainer.style.height = '24px';

    toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = `toggle-${title.replace(/\s+/g, '')}`;
    toggleInput.checked = initialToggleState;
    toggleInput.style.opacity = '0';
    toggleInput.style.width = '0';
    toggleInput.style.height = '0';

    toggleLabel = document.createElement('label');
    toggleLabel.setAttribute('for', toggleInput.id);
    toggleLabel.style.position = 'absolute';
    toggleLabel.style.cursor = 'pointer';
    toggleLabel.style.top = '0';
    toggleLabel.style.left = '0';
    toggleLabel.style.right = '0';
    toggleLabel.style.bottom = '0';
    toggleLabel.style.backgroundColor = initialToggleState ? '#3b82f6' : '#374151';
    toggleLabel.style.borderRadius = '12px';
    toggleLabel.style.transition = 'background-color 0.2s ease';

    toggleThumb = document.createElement('div');
    toggleThumb.style.position = 'absolute';
    toggleThumb.style.height = '18px';
    toggleThumb.style.width = '18px';
    toggleThumb.style.left = initialToggleState ? '23px' : '3px';
    toggleThumb.style.bottom = '3px';
    toggleThumb.style.backgroundColor = '#ffffff';
    toggleThumb.style.borderRadius = '50%';
    toggleThumb.style.transition = 'transform 0.2s ease, left 0.2s ease';

    toggleLabel.appendChild(toggleThumb);
    toggleContainer.appendChild(toggleInput);
    toggleContainer.appendChild(toggleLabel);
    leftSide.appendChild(toggleContainer);

    section.__toggle = toggleInput;
  }

  leftSide.appendChild(titleEl);
  rightSide.appendChild(expandIcon);
  header.appendChild(leftSide);
  header.appendChild(rightSide);

  const contentDiv = document.createElement('div');
  contentDiv.style.padding = '0 20px 16px';
  contentDiv.style.backgroundColor = '#1a1a1a';
  contentDiv.style.overflow = 'hidden';
  contentDiv.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  contentDiv.appendChild(content);

  if (hasToggle) {
    toggleInput.addEventListener('change', () => {
      const isChecked = toggleInput.checked;
      toggleLabel.style.backgroundColor = isChecked ? '#3b82f6' : '#374151';
      toggleThumb.style.left = isChecked ? '23px' : '3px';
      contentDiv.style.maxHeight = isChecked ? contentDiv.scrollHeight + 'px' : '0';
      contentDiv.style.padding = isChecked ? '0 20px 16px' : '0 20px';
      contentDiv.style.opacity = isChecked ? '1' : '0.2';
      contentDiv.style.pointerEvents = isChecked ? 'auto' : 'none';
      expandIcon.style.transform = isChecked ? 'rotate(0deg)' : 'rotate(-90deg)';
      if (typeof onToggleChange === 'function') {
        onToggleChange(isChecked);
      }
    });
  }

  header.addEventListener('mouseenter', () => {
    header.style.backgroundColor = '#374151';
  });

  header.addEventListener('mouseleave', () => {
    header.style.backgroundColor = '#2d2d2d';
  });

  const sectionId = title.replace(/\s+/g, '');
  let isCollapsed = this.collapsedSections[sectionId] || !initialToggleState;

  const updateCollapsedState = () => {
    if (isCollapsed) {
      contentDiv.style.maxHeight = '0';
      contentDiv.style.padding = '0 20px';
      expandIcon.style.transform = 'rotate(-90deg)';
    } else {
      contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
      contentDiv.style.padding = '0 20px 16px';
      expandIcon.style.transform = 'rotate(0deg)';
    }

    if (hasToggle) {
      contentDiv.style.opacity = toggleInput.checked ? '1' : '0.5';
      contentDiv.style.pointerEvents = toggleInput.checked ? 'auto' : 'none';
    } else {
      contentDiv.style.opacity = '1';
      contentDiv.style.pointerEvents = 'auto';
    }
  };

  header.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    this.collapsedSections[sectionId] = isCollapsed;
    updateCollapsedState();
  });

  if (hasToggle) {
    toggleInput.checked = initialToggleState;
    toggleLabel.style.backgroundColor = initialToggleState ? '#3b82f6' : '#374151';
    toggleThumb.style.left = initialToggleState ? '23px' : '3px';
    contentDiv.style.opacity = initialToggleState ? '1' : '0.5';
    contentDiv.style.pointerEvents = initialToggleState ? 'auto' : 'none';

    if (!initialToggleState) {
      contentDiv.style.maxHeight = '0';
      contentDiv.style.padding = '0 20px';
      expandIcon.style.transform = 'rotate(-90deg)';
    }
  } else {
    if (!initialToggleState) {
      contentDiv.style.maxHeight = '0';
      contentDiv.style.padding = '0 20px';
      expandIcon.style.transform = 'rotate(-90deg)';
    } else {
      contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
      contentDiv.style.opacity = '1';
      contentDiv.style.pointerEvents = 'auto';
      expandIcon.style.transform = 'rotate(0deg)';
    }
  }

  section.appendChild(header);
  section.appendChild(contentDiv);

  return section;
}


  setupPropertiesUI() {
    // Clear existing properties
    this.propertiesPanel.clear();
    this.propertyInputs = {};

    // Create sections for better organization
    const particlePropsContent = document.createElement('div');
    const motionPhysicsContent = document.createElement('div');
    const emissionContent = document.createElement('div');
    const simulationContent = document.createElement('div');
    const curvesContent = document.createElement('div');
    const gradientContent = document.createElement('div');

    // Particle Properties Section
    this.addNumberPropertyToContainer(particlePropsContent, 'Particle Count', 'particleCount', 1000, 1, 10000, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateParticleCount(value);
      }
    });

    this.addNumberPropertyToContainer(particlePropsContent, 'Max Life', 'maxLife', 3, 0.1, 10, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('maxLife', value);
      }
    });

    this.addNumberPropertyToContainer(particlePropsContent, 'Size', 'size', 0.1, 0.01, 2, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('size', value);
      }
    });

    this.addNumberPropertyToContainer(particlePropsContent, 'Opacity', 'opacity', 0.8, 0, 1, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('opacity', value);
      }
    });

    this.addColorPropertyToContainer(particlePropsContent, 'Color', 'color', 0x66ccff, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('color', value);
      }
    });

    // Motion & Physics Section
    this.addNumberPropertyToContainer(motionPhysicsContent, 'Start Speed', 'startSpeed', 5, 0, 50, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('startSpeed', value);
      }
    });

    this.addNumberPropertyToContainer(motionPhysicsContent, 'Speed Variation', 'speedVariation', 5, 0, 20, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('speedVariation', value);
      }
    });

    this.addNumberPropertyToContainer(motionPhysicsContent, 'Gravity', 'gravity', -9.8, -50, 50, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('gravity', value);
      }
    });

    this.addNumberPropertyToContainer(motionPhysicsContent, 'Spread', 'spread', Math.PI / 6, 0, Math.PI, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('spread', value);
      }
    });

    // Emission Settings Section
    this.addNumberPropertyToContainer(emissionContent, 'Emission Rate', 'emissionRate', 1, 0.1, 10000, (value) => {
      if (this.currentSystem) {
        console.log(value)
        this.currentSystem.updateProperty('emissionRate', value);
      }
    });

    this.addBooleanPropertyToContainer(emissionContent, 'Burst Mode', 'burst', false, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('burst', value);
      }
    });

    this.addNumberPropertyToContainer(emissionContent, 'Burst Count', 'burstCount', 100, 1, 1000, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('burstCount', value);
      }
    });

    this.addBooleanPropertyToContainer(emissionContent, 'Play on Awake', 'playOnAwake', true, (value) => {
      if (this.currentSystem) {
        this.currentSystem.updateProperty('playOnAwake', value);
      }
    });

    this.addBooleanPropertyToContainer(emissionContent, 'Loop', 'loop', true, (value) => {
      if (this.currentSystem) {
        console.log(value)
        this.currentSystem.updateProperty('loop', value);
      }
    });

    // Simulation Settings Section
    this.addDropdownPropertyToContainer(simulationContent, 'Simulation Space', 'simulationSpace', 'Local', ['Local', 'World'], (value) => {
      if (this.currentSystem) {
        this.currentSystem.setSimulationSpace(value);
      }
    });

    // Curves Section
    this.addCurvePropertyToContainer(curvesContent);
    this.addColorOverLifetimePropertyToContainer(gradientContent);

    // Add all sections to the properties panel
    this.propertiesPanel.dom.appendChild(this.createCollapsibleSection('Particle Properties', particlePropsContent));
    this.propertiesPanel.dom.appendChild(this.createCollapsibleSection('Motion & Physics', motionPhysicsContent));
    this.propertiesPanel.dom.appendChild(this.createCollapsibleSection('Emission Settings', emissionContent));
    this.propertiesPanel.dom.appendChild(this.createCollapsibleSection('Simulation Settings', simulationContent));
    const sizeOverLifetimeToggle = this.createCollapsibleSection(
      'Size Over Lifetime',
      curvesContent,
      true,
      false,
      (enabled) => {
        this.currentSystem.useSizeOverTime = enabled;
        this.currentSystem.config.useSizeOverTime = enabled;
        this.editor.signals.sceneGraphChanged.dispatch();
      }
    );

    // Register the toggle in propertyInputs
    this.propertyInputs.useSizeOverTime = {
      getValue: () => sizeOverLifetimeToggle.__toggle?.checked,
      setValue: (value) => {
        const toggle = sizeOverLifetimeToggle.__toggle;
        if (toggle) {
          toggle.checked = value;
          toggle.dispatchEvent(new Event('change')); // simulate user toggle
          
        }
      }
    };

    // Add to UI
    this.propertiesPanel.dom.appendChild(sizeOverLifetimeToggle);
    const colorOverLifeTimeToggle = this.createCollapsibleSection(
      'Color Over Lifetime',
      gradientContent,
      true,
      false,
      (enabled) => {
        this.currentSystem.useColorOverTime = enabled;
        this.editor.signals.sceneGraphChanged.dispatch();
      }
    ); // Add toggle, initially off
    this.propertyInputs.useColorOverTime = {
      getValue: () => colorOverLifeTimeToggle.__toggle?.checked,
      setValue: (value) => {
        const toggle = colorOverLifeTimeToggle.__toggle;
        if (toggle) {
          toggle.checked = value;
          toggle.dispatchEvent(new Event('change')); // simulate user toggle
          
          
        }
      }
    };
    this.propertiesPanel.dom.appendChild(colorOverLifeTimeToggle);
  }

  addCurvePropertyToContainer(container) {
    // Initialize curve editor with improved styling
    this.sizeCurveEditor = new CurveEditor({
      label: 'Size Curve',
      width: 260,
      height: 120,
      minValue: 0,
      maxValue: 3,
      onChange: () => {
        // if (this.currentSystem) {
        //   const curvePoints = this.sizeCurveEditor.getCurveData(); // ✅ the right method
        //   this.currentSystem.config.sizeOverTimeCurve = curvePoints;
        //   this.currentSystem.sizeOverTime = (t) => interpolateCurve(t, curvePoints);
        //   this.editor.signals.sceneGraphChanged.dispatch();
        // }
        this.updateSizeCurveSystem();
      }
    });

    // Style the curve editor container
    if (this.sizeCurveEditor.container && this.sizeCurveEditor.container.dom) {
      this.sizeCurveEditor.container.dom.style.backgroundColor = '#2d2d2d';
      this.sizeCurveEditor.container.dom.style.borderRadius = '6px';
      this.sizeCurveEditor.container.dom.style.padding = '16px';
      this.sizeCurveEditor.container.dom.style.border = '1px solid #374151';
      this.sizeCurveEditor.container.dom.style.marginBottom = '16px';
    }

    container.appendChild(this.sizeCurveEditor.container.dom);
  }
  updateSizeCurveSystem() {
    if (this.currentSystem && this.currentSystem.useSizeOverTime) {
      const curvePoints = this.sizeCurveEditor.getCurveData();
      this.currentSystem.config.sizeOverTimeCurve = curvePoints;
      this.currentSystem.sizeOverTime = (t) => interpolateCurve(t, curvePoints);
      this.editor.signals.sceneGraphChanged.dispatch();
      //console.log( this.currentSystem.config.sizeOverTimeCurve)
    }
  }

  addColorOverLifetimePropertyToContainer(container) {
    this.colorGradient = new GradientEditor({
      label: 'Color Over Lifetime',
      onChange: () => {
        //   if (this.currentSystem) {
        //     const gradientData = this.colorGradient.getGradientData();

        //     this.currentSystem.config.colorOverTimeCurve = gradientData;

        //     this.currentSystem.colorOverTime = (t) => {
        //       const p = interpolateColorCurve(t, gradientData);
        //       return {
        //         color: new THREE.Color(p.r / 255, p.g / 255, p.b / 255),
        //         alpha: p.a
        //       };
        //     };

        //     this.editor.signals.sceneGraphChanged.dispatch();
        //   }
        this.updateColorGradientSystem();
      }
    });

    // Style the gradient editor container
    if (this.colorGradient.container && this.colorGradient.container.dom) {
      this.colorGradient.container.dom.style.backgroundColor = '#2d2d2d';
      this.colorGradient.container.dom.style.borderRadius = '6px';
      this.colorGradient.container.dom.style.padding = '16px';
      this.colorGradient.container.dom.style.border = '1px solid #374151';
    }

    container.appendChild(this.colorGradient.container.dom);
  }
  updateColorGradientSystem() {
    if (this.currentSystem && this.currentSystem.useColorOverTime) {
      const gradientData = this.colorGradient.getGradientData();
      this.currentSystem.config.colorOverTimeCurve = gradientData;
      this.currentSystem.colorOverTime = (t) => {
        const p = interpolateColorCurve(t, gradientData);
        return {
          color: new THREE.Color(p.r / 255, p.g / 255, p.b / 255),
          alpha: p.a
        };
      };

      this.editor.signals.sceneGraphChanged.dispatch();
    }
  }

  addNumberPropertyToContainer(container, label, property, defaultValue, min, max, onChange) {
    const row = document.createElement('div');
    row.style.marginBottom = '16px';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '8px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.fontSize = '12px';
    labelEl.style.fontWeight = '500';
    labelEl.style.color = '#9ca3af';
    labelEl.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.gap = '12px';

    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) > 10 ? 1 : 0.1;
    slider.value = defaultValue;
    slider.style.flex = '1';
    slider.style.height = '4px';
    slider.style.backgroundColor = '#374151';
    slider.style.borderRadius = '2px';
    slider.style.outline = 'none';
    slider.style.cursor = 'pointer';
    slider.style.webkitAppearance = 'none';
    slider.style.appearance = 'none';

    // Style slider thumb
    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background-color: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover
      {
        background-color: #2563eb;
        transform: scale(1.1);
      }
      input[type="range"]::-moz-range-thumb 
      {
        width: 16px;
        height: 16px;
        background-color: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }
    `;
    document.head.appendChild(sliderStyle);

    // Create number input
    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = min;
    numberInput.max = max;
    numberInput.step = slider.step;
    numberInput.value = defaultValue;
    numberInput.style.width = '80px';
    numberInput.style.padding = '6px 8px';
    numberInput.style.backgroundColor = '#2d2d2d';
    numberInput.style.border = '1px solid #374151';
    numberInput.style.borderRadius = '4px';
    numberInput.style.color = '#ffffff';
    numberInput.style.fontSize = '12px';
    numberInput.style.textAlign = 'center';
    numberInput.style.outline = 'none';
    numberInput.style.transition = 'border-color 0.2s ease';
    numberInput.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    numberInput.addEventListener('focus', () => {
      numberInput.style.borderColor = '#3b82f6';
    });
    numberInput.addEventListener('blur', () => {
      numberInput.style.borderColor = '#374151';
    });

    // Synchronize slider and input
    slider.addEventListener('input', () => {
      numberInput.value = parseFloat(slider.value).toFixed(2);
      onChange(parseFloat(slider.value));
      editor.signals.sceneGraphChanged.dispatch();
    });

    numberInput.addEventListener('input', () => {
      slider.value = numberInput.value;
      onChange(parseFloat(numberInput.value));
      editor.signals.sceneGraphChanged.dispatch();
    });

    // Prevent dragging on input elements
    slider.addEventListener('mousedown', (e) => e.stopPropagation());
    numberInput.addEventListener('mousedown', (e) => e.stopPropagation());

    inputContainer.appendChild(slider);
    inputContainer.appendChild(numberInput);

    row.appendChild(labelEl);
    row.appendChild(inputContainer);
    container.appendChild(row);

    // Store reference to input
    this.propertyInputs[property] = {
      getValue: () => parseFloat(numberInput.value),
      setValue: (value) => {
        slider.value = value;
        numberInput.value = parseFloat(value).toFixed(2);
      }
    };
  }

  addColorPropertyToContainer(container, label, property, defaultValue, onChange) {
    const row = document.createElement('div');
    row.style.marginBottom = '16px';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '8px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.fontSize = '12px';
    labelEl.style.fontWeight = '500';
    labelEl.style.color = '#9ca3af';
    labelEl.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.gap = '12px';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#' + defaultValue.toString(16).padStart(6, '0');
    colorInput.style.width = '40px';
    colorInput.style.height = '28px';
    colorInput.style.border = '1px solid #374151';
    colorInput.style.borderRadius = '4px';
    colorInput.style.background = 'none';
    colorInput.style.cursor = 'pointer';
    colorInput.style.outline = 'none';

    const colorPreview = document.createElement('div');
    colorPreview.style.width = '60px';
    colorPreview.style.height = '28px';
    colorPreview.style.backgroundColor = colorInput.value;
    colorPreview.style.border = '1px solid #374151';
    colorPreview.style.borderRadius = '4px';
    colorPreview.style.display = 'flex';
    colorPreview.style.alignItems = 'center';
    colorPreview.style.justifyContent = 'center';
    colorPreview.style.fontSize = '10px';
    colorPreview.style.color = '#9ca3af';

    colorInput.addEventListener('input', () => {
      colorPreview.style.backgroundColor = colorInput.value;
      onChange(parseInt(colorInput.value.replace('#', ''), 16));
      editor.signals.sceneGraphChanged.dispatch();
    });

    // Prevent dragging on input elements
    colorInput.addEventListener('mousedown', (e) => e.stopPropagation());

    inputContainer.appendChild(colorInput);
    inputContainer.appendChild(colorPreview);

    row.appendChild(labelEl);
    row.appendChild(inputContainer);
    container.appendChild(row);

    // Store reference to input
    this.propertyInputs[property] = {
      getValue: () => parseInt(colorInput.value.replace('#', ''), 16),
      setValue: (value) => {
        const hexValue = '#' + value.toString(16).padStart(6, '0');
        colorInput.value = hexValue;
        colorPreview.style.backgroundColor = hexValue;
      }
    };
  }

  addBooleanPropertyToContainer(container, label, property, defaultValue, onChange) {
    const row = document.createElement('div');
    row.style.marginBottom = '16px';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.fontSize = '12px';
    labelEl.style.fontWeight = '500';
    labelEl.style.color = '#9ca3af';
    labelEl.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    // Create toggle switch
    const toggleContainer = document.createElement('div');
    toggleContainer.style.position = 'relative';
    toggleContainer.style.display = 'inline-block';
    toggleContainer.style.width = '44px';
    toggleContainer.style.height = '24px';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = `toggle-${property}`;
    toggleInput.checked = defaultValue;
    toggleInput.style.opacity = '0';
    toggleInput.style.width = '0';
    toggleInput.style.height = '0';

    const toggleLabel = document.createElement('label');
    toggleLabel.setAttribute('for', toggleInput.id);
    toggleLabel.style.position = 'absolute';
    toggleLabel.style.cursor = 'pointer';
    toggleLabel.style.top = '0';
    toggleLabel.style.left = '0';
    toggleLabel.style.right = '0';
    toggleLabel.style.bottom = '0';
    toggleLabel.style.backgroundColor = defaultValue ? '#3b82f6' : '#374151';
    toggleLabel.style.borderRadius = '12px';
    toggleLabel.style.transition = 'background-color 0.2s ease';

    const toggleThumb = document.createElement('div');
    toggleThumb.style.position = 'absolute';
    toggleThumb.style.content = '';
    toggleThumb.style.height = '18px';
    toggleThumb.style.width = '18px';
    toggleThumb.style.left = defaultValue ? '23px' : '3px';
    toggleThumb.style.bottom = '3px';
    toggleThumb.style.backgroundColor = '#ffffff';
    toggleThumb.style.borderRadius = '50%';
    toggleThumb.style.transition = 'transform 0.2s ease, left 0.2s ease';

    toggleLabel.appendChild(toggleThumb);
    toggleContainer.appendChild(toggleInput);
    toggleContainer.appendChild(toggleLabel);

    toggleInput.addEventListener('change', () => {
      const isChecked = toggleInput.checked;
      console.log(isChecked)
      toggleLabel.style.backgroundColor = isChecked ? '#3b82f6' : '#374151';
      toggleThumb.style.left = isChecked ? '23px' : '3px';
      onChange(isChecked); // Call the onChange callback here
      editor.signals.sceneGraphChanged.dispatch();
    });

    // Prevent dragging on input elements
    toggleContainer.addEventListener('mousedown', (e) => e.stopPropagation());

    row.appendChild(labelEl);
    row.appendChild(toggleContainer);
    container.appendChild(row);

    // Store reference to input
    this.propertyInputs[property] = {
      getValue: () => toggleInput.checked,
      setValue: (value) => {
        toggleInput.checked = value;
        toggleLabel.style.backgroundColor = value ? '#3b82f6' : '#374151';
        toggleThumb.style.left = value ? '23px' : '3px';
        onChange(value); // Also call onChange when setValue is called programmatically
      }
    };
  }

  addDropdownPropertyToContainer(container, label, property, defaultValue, options, onChange) {
    const row = document.createElement('div');
    row.style.marginBottom = '16px';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '8px';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.fontSize = '12px';
    labelEl.style.fontWeight = '500';
    labelEl.style.color = '#9ca3af';
    labelEl.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '8px 12px';
    select.style.backgroundColor = '#2d2d2d';
    select.style.border = '1px solid #374151';
    select.style.borderRadius = '4px';
    select.style.color = '#ffffff';
    select.style.fontSize = '12px';
    select.style.outline = 'none';
    select.style.cursor = 'pointer';
    select.style.transition = 'border-color 0.2s ease';
    select.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    select.addEventListener('focus', () => {
      select.style.borderColor = '#3b82f6';
    });
    select.addEventListener('blur', () => {
      select.style.borderColor = '#374151';
    });

    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      optionEl.style.backgroundColor = '#2d2d2d';
      optionEl.style.color = '#ffffff';
      if (option === defaultValue) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    select.addEventListener('change', () => {
      onChange(select.value);
      editor.signals.sceneGraphChanged.dispatch();
    });

    // Prevent dragging on input elements
    select.addEventListener('mousedown', (e) => e.stopPropagation());

    row.appendChild(labelEl);
    row.appendChild(select);
    container.appendChild(row);

    // Store reference to input
    this.propertyInputs[property] = {
      getValue: () => select.value,
      setValue: (value) => select.value = value
    };
  }

  // Keep all the existing methods unchanged
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
      editor.signals.sceneGraphChanged.dispatch();
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
      editor.signals.sceneGraphChanged.dispatch();
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

    select.addEventListener('change', () => {
      onChange(select.value);
      editor.signals.sceneGraphChanged.dispatch();
    });

    // Prevent dragging on input elements
    select.addEventListener('mousedown', (e) => {
      e.stopPropagation();
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
    // 1. Update UI property fields
    Object.keys(this.propertyInputs).forEach(property => {
      const input = this.propertyInputs[property];
      const value = config[property];
      if (input && value !== undefined) {
        if (typeof input.setValue === 'function') {
          input.setValue(value);
        } else if (property === 'color' && input.setHexValue) {
          input.setHexValue(value);
        }
      }
    });
    // 2. Update Size Over Lifetime curve editor
    if (this.sizeCurveEditor && config.sizeOverTimeCurve) {
      console.log('Restoring curve:', config.sizeOverTimeCurve);
      this.sizeCurveEditor.setCurveData(config.sizeOverTimeCurve);
    } else {
      console.warn('Missing curve data!', config.sizeOverTimeCurve);
    }
    // 3. Update Color Over Lifetime gradient editor
    if (this.colorGradient && config.colorOverTimeCurve) {
      this.colorGradient.setGradientData(config.colorOverTimeCurve);
    }
  }


  createNewSystem() {
    try {
      const system = new ParticleSystem();
      system.name = 'ParticleSystem';

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
    if (object instanceof ParticleSystem) {
      this.currentSystem = object;
      
      this.updateEditorValues();
      object.play();
      console.log('Bound to ParticleSystem:', object);
    } else {
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
    this.container.dom.style.flexDirection = 'column';
    this.container.dom.style.height = '70vh'; // Increased height for better usability
    this.container.dom.style.display = 'flex';
    this.container.dom.style.top = '50%';
    this.container.dom.style.left = '50%';
    this.container.dom.style.transform = 'translate(-50%, -50%)';
    this.container.dom.style.background = '#1a1a1a';
    this.container.dom.style.border = '1px solid #374151';
    this.container.dom.style.borderRadius = '8px';
    this.container.dom.style.padding = '0';
    this.container.dom.style.zIndex = '1000';
    this.container.dom.style.width = '400px';
    this.container.dom.style.display = 'block';
    this.container.dom.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    this.container.dom.style.fontFamily = 'Inter, "Segoe UI", sans-serif';

    const resizeHandle = document.createElement('div');
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.width = '12px';
    resizeHandle.style.height = '12px';
    resizeHandle.style.right = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.background = '#666';
    resizeHandle.style.borderRadius = '0 0 8px 0';
    resizeHandle.style.zIndex = '1001';
    this.container.dom.appendChild(resizeHandle);
    document.body.appendChild(this.container.dom);
    this.makeDraggable();

    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = this.container.dom.offsetWidth;
      const startHeight = this.container.dom.offsetHeight;

      const onMouseMove = (e) => {
        const newWidth = Math.max(350, startWidth + (e.clientX - startX));
        const newHeight = Math.max(300, startHeight + (e.clientY - startY));
        this.container.dom.style.width = `${newWidth}px`;
        this.container.dom.style.height = `${newHeight}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
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
function interpolateCurve(t, curve) {
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (t <= b.t) {
      const ratio = (t - a.t) / (b.t - a.t);
      return a.value + (b.value - a.value) * ratio;
    }
  }
  return curve[curve.length - 1].value;
}

function interpolateColorCurve(t, stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return { r: 255, g: 255, b: 255, a: 1 }; // fallback white
  }

  stops.sort((a, b) => a.t - b.t);
  t = Math.max(0, Math.min(1, t));

  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];

    if (t >= s0.t && t <= s1.t) {
      const u = (t - s0.t) / (s1.t - s0.t);
      return {
        r: s0.r + (s1.r - s0.r) * u,
        g: s0.g + (s1.g - s0.g) * u,
        b: s0.b + (s1.b - s0.b) * u,
        a: s0.a + (s1.a - s0.a) * u
      };
    }
  }

  // t is exactly 1 or above last stop
  const last = stops[stops.length - 1];
  return { r: last.r, g: last.g, b: last.b, a: last.a };
}

export { ParticleSystemEditor };


