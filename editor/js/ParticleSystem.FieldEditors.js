import { UIDiv, UIButton, UIText, UIRow, UIPanel, UIColor, UINumber } from './libs/ui.js';

// Enhanced Curve Editor with Bezier curves and multiple curve types
class CurveEditor {
  constructor(config = {}) {
    this.config = {
      width: config.width || 320,
      height: config.height || 200,
      backgroundColor: config.backgroundColor || '#222',
      gridColor: config.gridColor || '#333',
      curveColor: config.curveColor || '#0f0',
      pointColor: config.pointColor || '#fff',
      label: config.label || 'Curve',
      ...config
    };

    this.container = new UIDiv()
      .setId('curve-editor')
      .setStyle('width', [this.config.width + 'px'])
      .setStyle('height', [this.config.height + 60 + 'px'])
      .setStyle('backgroundColor', [this.config.backgroundColor])
      .setStyle('border', ['1px solid #444'])
      .setStyle('position', ['relative'])
      .setStyle('padding', ['8px']);

    // Header
    const header = new UIRow();
    const title = new UIText(this.config.label).setStyle('color', '#fff').setStyle('font-weight', 'bold');
    header.add(title);
    this.container.add(header);

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.canvas.style.border = '1px solid #444';
    this.canvas.style.backgroundColor = '#111';
    this.container.dom.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Control points: normalized [0..1] for time, value can be outside [0,1]
    this.points = [
      { t: 0, value: 0.5, type: 'linear' },
      { t: 1, value: 0.5, type: 'linear' },
    ];

    this.activePoint = null;
    this.isDragging = false;
    






    this.presets = {
      'Linear': [{ t: 0, value: 0 }, { t: 1, value: 1 }],
      'Ease In': [{ t: 0, value: 0 }, { t: 0.3, value: 0.1 }, { t: 1, value: 1 }],
      'Ease Out': [{ t: 0, value: 0 }, { t: 0.7, value: 0.9 }, { t: 1, value: 1 }],
      'Bell Curve': [{ t: 0, value: 0 }, { t: 0.5, value: 1 }, { t: 1, value: 0 }],
      'Spike': [{ t: 0, value: 0 }, { t: 0.1, value: 1 }, { t: 0.2, value: 0 }, { t: 1, value: 0 }],
      'Bounce': [{ t: 0, value: 0 }, { t: 0.3, value: 1 }, { t: 0.6, value: 0.3 }, { t: 1, value: 1 }]
    };

    this.setupControls();
    this.setupEvents();
    this.draw();

    // Callback for when curve changes
    this.onChange = config.onChange || (() => { });
  }
  
  setupControls() {
    const controlsRow = new UIRow();
    controlsRow.setStyle('margin-top', '8px');
    controlsRow.setStyle('gap', '4px');


    // Min/Max inputs
    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.value = this.config.minValue;
    minInput.style.width = '60px';
    minInput.style.background = '#333';
    minInput.style.color = '#fff';
    minInput.style.border = '1px solid #555';
    minInput.style.padding = '4px';
    minInput.style.fontSize = '12px';
    minInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.stopPropagation();
      }
    });
    minInput.addEventListener('change', () => {
      this.config.minValue = parseFloat(minInput.value);
      this.draw();
      this.onChange(this);
    });

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.value = this.config.maxValue;
    maxInput.style.width = '60px';
    maxInput.style.background = '#333';
    maxInput.style.color = '#fff';
    maxInput.style.border = '1px solid #555';
    maxInput.style.padding = '4px';
    maxInput.style.fontSize = '12px';
    maxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.stopPropagation();
      }
    });
    maxInput.addEventListener('change', () => {
      this.config.maxValue = parseFloat(maxInput.value);
      this.draw();
      this.onChange(this);
    });

    // Preset dropdown
    const presetSelect = document.createElement('select');
    presetSelect.style.background = '#333';
    presetSelect.style.color = '#fff';
    presetSelect.style.border = '1px solid #555';
    presetSelect.style.padding = '4px';
    presetSelect.style.fontSize = '12px';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Presets...';
    presetSelect.appendChild(defaultOption);

    Object.keys(this.presets).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      presetSelect.appendChild(option);
    });
    presetSelect.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.stopPropagation();
      }
    });
    presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadPreset(e.target.value);
        e.target.value = '';
      }
    });

    // Clear button
    const clearBtn = new UIButton('Clear')
      .setStyle('font-size', '12px')
      .setStyle('padding', '4px 8px')
      .onClick(() => {
        this.points = [
          { t: 0, value: 0.5, type: 'linear' },
          { t: 1, value: 0.5, type: 'linear' }
        ];
        this.draw();
        this.onChange(this);
      });

    // Smooth button
    const smoothBtn = new UIButton('Smooth')
      .setStyle('font-size', '12px')
      .setStyle('padding', '4px 8px')
      .onClick(() => {
        this.points.forEach(p => p.type = 'smooth');
        this.draw();
        this.onChange(this);
      });
    controlsRow.dom.appendChild(minInput);
    controlsRow.dom.appendChild(maxInput);
    controlsRow.dom.appendChild(presetSelect);
    controlsRow.add(clearBtn);
    controlsRow.add(smoothBtn);
    this.container.add(controlsRow);
  }

  setupEvents() {
    this.canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.stopPropagation();
      }
    });
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width;
      const ty = 1 - (e.clientY - rect.top) / rect.height;

      // Convert to actual value range
      const actualValue = this.config.minValue + ty * (this.config.maxValue - this.config.minValue);

      // Find nearby point
      this.activePoint = this.points.find(p => {
        const px = p.t;
        const py = (p.value - this.config.minValue) / (this.config.maxValue - this.config.minValue);
        return Math.hypot(px - tx, py - ty) < 0.05;
      });

      if (!this.activePoint && e.ctrlKey) {
        // Add new point on Ctrl+Click
        const newPoint = { t: tx, value: actualValue, type: 'linear' };
        this.points.push(newPoint);
        this.activePoint = newPoint;
        this.points.sort((a, b) => a.t - b.t);
      }

      if (this.activePoint) {
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
      }

      this.draw();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.activePoint) return;

      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ty = 1 - (e.clientY - rect.top) / rect.height;

      // Convert to actual value range
      const actualValue = this.config.minValue + ty * (this.config.maxValue - this.config.minValue);

      // Don't let first and last points move in time
      if (this.points.indexOf(this.activePoint) !== 0 &&
        this.points.indexOf(this.activePoint) !== this.points.length - 1) {
        this.activePoint.t = tx;
      }

      this.activePoint.value = actualValue;
      this.draw();
      this.onChange(this);
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.activePoint = null;
      this.canvas.style.cursor = 'default';
    });

    // Double-click to delete point
    this.canvas.addEventListener('dblclick', (e) => {
      if (this.points.length <= 2) return;

      const rect = this.canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width;
      const ty = 1 - (e.clientY - rect.top) / rect.height;

      const pointToDelete = this.points.find(p => {
        const px = p.t;
        const py = (p.value - this.config.minValue) / (this.config.maxValue - this.config.minValue);
        return Math.hypot(px - tx, py - ty) < 0.05;
      });

      if (pointToDelete && this.points.indexOf(pointToDelete) !== 0 &&
        this.points.indexOf(pointToDelete) !== this.points.length - 1) {
        this.points = this.points.filter(p => p !== pointToDelete);
        this.draw();
        this.onChange(this);
      }
    });

    // Hover effect
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) return;

      const rect = this.canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width;
      const ty = 1 - (e.clientY - rect.top) / rect.height;

      const hoverPoint = this.points.find(p => {
        const px = p.t;
        const py = (p.value - this.config.minValue) / (this.config.maxValue - this.config.minValue);
        return Math.hypot(px - tx, py - ty) < 0.05;
      });

      this.canvas.style.cursor = hoverPoint ? 'grab' : 'default';
    });
  }

  loadPreset(presetName) {
    if (this.presets[presetName]) {
      this.points = this.presets[presetName].map(p => ({ ...p, type: 'linear' }));
      this.draw();
      this.onChange(this);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.3;

    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * this.canvas.width;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * this.canvas.height;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;

    // Draw curve
    this.ctx.beginPath();
    this.points.sort((a, b) => a.t - b.t);

    for (let x = 0; x <= this.canvas.width; x++) {
      const t = x / this.canvas.width;
      const value = this.getValue(t);
      const normalizedValue = (value - this.config.minValue) / (this.config.maxValue - this.config.minValue);
      const y = this.canvas.height * (1 - normalizedValue);

      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.strokeStyle = this.config.curveColor;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw points
    this.points.forEach((p, index) => {
      const x = p.t * this.canvas.width;
      const normalizedValue = (p.value - this.config.minValue) / (this.config.maxValue - this.config.minValue);
      const y = (1 - normalizedValue) * this.canvas.height;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = this.config.pointColor;
      this.ctx.fill();
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw point index
      this.ctx.fillStyle = '#000';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(index.toString(), x, y + 3);
    });

    // Draw value labels
    this.ctx.fillStyle = '#ccc';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.config.maxValue.toFixed(2), 5, 15);
    this.ctx.fillText(this.config.minValue.toFixed(2), 5, this.canvas.height - 5);
  }

  getValue(t) {
    this.points.sort((a, b) => a.t - b.t);
    t = Math.max(0, Math.min(1, t));

    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[i];
      const p1 = this.points[i + 1];

      if (t >= p0.t && t <= p1.t) {
        const u = (t - p0.t) / (p1.t - p0.t);
        if (p0.type === 'smooth' || p1.type === 'smooth') {
          // basic ease-in/ease-out
          const uSmooth = u * u * (3 - 2 * u); // smoothstep
          return p0.value + (p1.value - p0.value) * uSmooth;
        } else {
          return p0.value + (p1.value - p0.value) * u; // linear
        }
      }
    }

    return this.points[this.points.length - 1].value;
  }


  // Get the curve as an array of values

  setCurveData(points) {
    console.log("sett")
    this.points = points.map(p => ({ ...p, type: p.type || 'linear' }));
    this.draw();
    this.onChange(this); // <-- pass full editor so you still have getValue(t)
  }

  getCurveData() {
    return this.points.map(p => ({ t: p.t, value: p.value, type: p.type }));
  }
}

// Gradient Editor with color stops
class GradientEditor {
  constructor(config = {}) {
    this.config = {
      width: config.width || 320,
      height: config.height || 60,
      backgroundColor: config.backgroundColor || '#222',
      label: config.label || 'Gradient',
      ...config
    };
    
    this.container = new UIDiv()
      .setId('gradient-editor')
      .setStyle('width', [this.config.width + 'px'])
      .setStyle('height', [this.config.height + 120 + 'px'])
      .setStyle('backgroundColor', [this.config.backgroundColor])
      .setStyle('border', ['1px solid #444'])
      .setStyle('position', ['relative'])
      .setStyle('padding', ['8px']);
    
    // Header
    const header = new UIRow();
    const title = new UIText(this.config.label).setStyle('color', '#fff').setStyle('font-weight', 'bold');
    header.add(title);
    this.container.add(header);
    
    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.canvas.style.border = '1px solid #444';
    this.canvas.style.backgroundColor = '#111';
    this.canvas.style.cursor = 'pointer';
    this.canvas.style.borderRadius = '4px';
    this.container.dom.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    
    // Color stops with RGBA support
    this.colorStops = [
      { t: 0, r: 255, g: 0, b: 0, a: 1 },
      { t: 1, r: 0, g: 0, b: 255, a: 1 }
    ];
    
    this.activeStop = null;
    this.isDragging = false;
    this.alphaSliderDragging = false;
    
    this.setupControls();
    this.setupEvents();
    this.draw();
    
    // Callback for when gradient changes
    this.onChange = config.onChange || (() => {});
  }
  
  setupControls() {
    const controlsRow = new UIRow();
    controlsRow.setStyle('margin-top', '8px');
    controlsRow.setStyle('gap', '8px');
    controlsRow.setStyle('align-items', 'center');
    controlsRow.setStyle('flex-wrap', 'wrap');
    
    // Color picker for active stop
    this.colorPicker = document.createElement('input');
    this.colorPicker.type = 'color';
    this.colorPicker.style.width = '40px';
    this.colorPicker.style.height = '25px';
    this.colorPicker.style.border = '1px solid #444';
    this.colorPicker.style.borderRadius = '4px';
    this.colorPicker.style.backgroundColor = 'transparent';
    this.colorPicker.style.cursor = 'pointer';
    this.colorPicker.addEventListener('input', () => {
      if (this.activeStop) {
        const color = this.hexToRgb(this.colorPicker.value);
        this.activeStop.r = color.r;
        this.activeStop.g = color.g;
        this.activeStop.b = color.b;
        this.draw();
        this.onChange(this);
      }
    });
    
    // Alpha slider
    const alphaGroup = new UIDiv().setStyle('display', 'flex').setStyle('align-items', 'center').setStyle('gap', '4px');
    const alphaLabel = new UIText('Alpha:').setStyle('color', '#ccc').setStyle('font-size', '12px');
    
    this.alphaSlider = document.createElement('div');
    this.alphaSlider.style.width = '80px';
    this.alphaSlider.style.height = '20px';
    this.alphaSlider.style.background = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
    this.alphaSlider.style.backgroundSize = '8px 8px';
    this.alphaSlider.style.backgroundPosition = '0 0, 0 4px, 4px -4px, -4px 0px';
    this.alphaSlider.style.borderRadius = '4px';
    this.alphaSlider.style.cursor = 'pointer';
    this.alphaSlider.style.position = 'relative';
    this.alphaSlider.style.border = '1px solid #444';
    
    this.alphaThumb = document.createElement('div');
    this.alphaThumb.style.position = 'absolute';
    this.alphaThumb.style.top = '50%';
    this.alphaThumb.style.transform = 'translate(-50%, -50%)';
    this.alphaThumb.style.width = '12px';
    this.alphaThumb.style.height = '12px';
    this.alphaThumb.style.background = '#fff';
    this.alphaThumb.style.border = '2px solid #000';
    this.alphaThumb.style.borderRadius = '50%';
    this.alphaThumb.style.cursor = 'pointer';
    this.alphaSlider.appendChild(this.alphaThumb);
    
    // Alpha input
    this.alphaInput = new UINumber(1).setWidth('60px').setRange(0, 1).setPrecision(2);
    this.alphaInput.onChange(() => {
      if (this.activeStop) {
        this.activeStop.a = this.alphaInput.getValue();
        this.updateAlphaSliderPosition();
        this.draw();
        this.onChange(this);
      }
    });
    
    // Position input
    const posLabel = new UIText('Position:').setStyle('color', '#ccc').setStyle('font-size', '12px');
    this.positionInput = new UINumber(0).setWidth('60px').setRange(0, 1).setPrecision(3);
    this.positionInput.onChange(() => {
      if (this.activeStop) {
        this.activeStop.t = this.positionInput.getValue();
        this.colorStops.sort((a, b) => a.t - b.t);
        this.draw();
        this.onChange(this);
      }
    });
    
    // Add stop button
    const addStopBtn = new UIButton('Add Stop')
      .setStyle('font-size', '12px')
      .setStyle('padding', '4px 8px')
      .onClick(() => {
        const t = Math.random();
        const color = this.getColorAt(t);
        const newStop = { t, ...color };
        this.colorStops.push(newStop);
        this.colorStops.sort((a, b) => a.t - b.t);
        this.activeStop = newStop;
        this.updateControls();
        this.draw();
        this.onChange(this);
      });
    
    // Remove stop button
    const removeStopBtn = new UIButton('Remove')
      .setStyle('font-size', '12px')
      .setStyle('padding', '4px 8px')
      .onClick(() => {
        if (this.activeStop && this.colorStops.length > 2) {
          this.colorStops = this.colorStops.filter(s => s !== this.activeStop);
          this.activeStop = null;
          this.updateControls();
          this.draw();
          this.onChange(this);
        }
      });
    
    // Build alpha group
    alphaGroup.add(alphaLabel);
    alphaGroup.dom.appendChild(this.alphaSlider);
    alphaGroup.add(this.alphaInput);
    
    // Build controls row
    controlsRow.dom.appendChild(this.colorPicker);
    controlsRow.add(alphaGroup);
    controlsRow.add(posLabel);
    controlsRow.add(this.positionInput);
    controlsRow.add(addStopBtn);
    controlsRow.add(removeStopBtn);
    this.container.add(controlsRow);
    
    // Preset gradients
    const presetRow = new UIRow();
    presetRow.setStyle('margin-top', '8px');
    presetRow.setStyle('gap', '4px');
    presetRow.setStyle('flex-wrap', 'wrap');
    
    const presets = {
      'Fire': [
        { t: 0, r: 255, g: 0, b: 0, a: 1 },
        { t: 0.5, r: 255, g: 136, b: 0, a: 1 },
        { t: 1, r: 255, g: 255, b: 0, a: 1 }
      ],
      'Water': [
        { t: 0, r: 0, g: 102, b: 204, a: 1 },
        { t: 1, r: 0, g: 204, b: 255, a: 1 }
      ],
      'Rainbow': [
        { t: 0, r: 255, g: 0, b: 0, a: 1 },
        { t: 0.17, r: 255, g: 136, b: 0, a: 1 },
        { t: 0.33, r: 255, g: 255, b: 0, a: 1 },
        { t: 0.5, r: 0, g: 255, b: 0, a: 1 },
        { t: 0.67, r: 0, g: 136, b: 255, a: 1 },
        { t: 0.83, r: 68, g: 0, b: 255, a: 1 },
        { t: 1, r: 136, g: 0, b: 255, a: 1 }
      ],
      'Fade Out': [
        { t: 0, r: 255, g: 255, b: 255, a: 1 },
        { t: 1, r: 255, g: 255, b: 255, a: 0 }
      ],
      'Fade In': [
        { t: 0, r: 255, g: 255, b: 255, a: 0 },
        { t: 1, r: 255, g: 255, b: 255, a: 1 }
      ]
    };
    
    Object.entries(presets).forEach(([name, stops]) => {
      const btn = new UIButton(name)
        .setStyle('font-size', '12px')
        .setStyle('padding', '4px 8px')
        .onClick(() => {
          this.colorStops = stops.map(s => ({ ...s }));
          this.activeStop = null;
          this.updateControls();
          this.draw();
          this.onChange(this);
        });
      presetRow.add(btn);
    });
    
    this.container.add(presetRow);
  }
  
  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width;
      
      // Find nearby stop
      this.activeStop = this.colorStops.find(stop => {
        return Math.abs(stop.t - tx) < 0.05;
      });
      
      if (!this.activeStop) {
        // Create new stop
        const color = this.getColorAt(tx);
        this.activeStop = { t: tx, ...color };
        this.colorStops.push(this.activeStop);
        this.colorStops.sort((a, b) => a.t - b.t);
      }
      
      this.isDragging = true;
      this.updateControls();
      this.draw();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.activeStop) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      
      this.activeStop.t = tx;
      this.colorStops.sort((a, b) => a.t - b.t);
      this.updateControls();
      this.draw();
      this.onChange(this);
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    // Double-click to remove stop
    this.canvas.addEventListener('dblclick', (e) => {
      if (this.colorStops.length <= 2) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width;
      
      const stopToRemove = this.colorStops.find(stop => {
        return Math.abs(stop.t - tx) < 0.05;
      });
      
      if (stopToRemove) {
        this.colorStops = this.colorStops.filter(s => s !== stopToRemove);
        this.activeStop = null;
        this.updateControls();
        this.draw();
        this.onChange(this);
      }
    });
    
    // Alpha slider events
    this.alphaSlider.addEventListener('mousedown', (e) => {
      this.alphaSliderDragging = true;
      this.updateAlphaFromSlider(e);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.alphaSliderDragging) return;
      this.updateAlphaFromSlider(e);
    });
    
    document.addEventListener('mouseup', () => {
      this.alphaSliderDragging = false;
    });
  }
  
  updateAlphaFromSlider(e) {
    if (!this.activeStop) return;
    
    const rect = this.alphaSlider.getBoundingClientRect();
    const alpha = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    
    this.activeStop.a = alpha;
    this.alphaInput.setValue(alpha);
    this.updateAlphaSliderPosition();
    this.draw();
    this.onChange(this);
  }
  
  updateAlphaSliderPosition() {
    if (!this.activeStop) return;
    this.alphaThumb.style.left = (this.activeStop.a * 100) + '%';
  }
  
  updateControls() {
    if (this.activeStop) {
      this.colorPicker.value = this.rgbToHex(this.activeStop.r, this.activeStop.g, this.activeStop.b);
      this.alphaInput.setValue(this.activeStop.a);
      this.positionInput.setValue(this.activeStop.t);
      this.updateAlphaSliderPosition();
    }
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw alpha background
    this.drawAlphaBackground();
    
    // Draw gradient
    this.drawGradient();
    
    // Draw stops
    this.drawStops();
  }
  
  drawAlphaBackground() {
    const tileSize = 8;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 10, this.canvas.width, this.canvas.height - 20);
    
    this.ctx.fillStyle = '#ccc';
    for (let x = 0; x < this.canvas.width; x += tileSize) {
      for (let y = 10; y < this.canvas.height - 10; y += tileSize) {
        if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
          this.ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }
  }
  
  drawGradient() {
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    
    this.colorStops.sort((a, b) => a.t - b.t);
    this.colorStops.forEach(stop => {
      gradient.addColorStop(stop.t, `rgba(${stop.r}, ${stop.g}, ${stop.b}, ${stop.a})`);
    });
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 10, this.canvas.width, this.canvas.height - 20);
  }
  
  drawStops() {
    this.colorStops.forEach(stop => {
      const x = stop.t * this.canvas.width;
      
      // Stop marker (top)
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x - 6, 10);
      this.ctx.lineTo(x + 6, 10);
      this.ctx.closePath();
      this.ctx.fillStyle = stop === this.activeStop ? '#fff' : '#ccc';
      this.ctx.fill();
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      // Stop marker (bottom)
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.canvas.height);
      this.ctx.lineTo(x - 6, this.canvas.height - 10);
      this.ctx.lineTo(x + 6, this.canvas.height - 10);
      this.ctx.closePath();
      this.ctx.fillStyle = stop === this.activeStop ? '#fff' : '#ccc';
      this.ctx.fill();
      this.ctx.stroke();
    });
  }
  
  getColorAt(t) {
    this.colorStops.sort((a, b) => a.t - b.t);
    t = Math.max(0, Math.min(1, t));
    
    for (let i = 0; i < this.colorStops.length - 1; i++) {
      const stop0 = this.colorStops[i];
      const stop1 = this.colorStops[i + 1];
      
      if (t >= stop0.t && t <= stop1.t) {
        const segmentT = (t - stop0.t) / (stop1.t - stop0.t);
        return {
          r: Math.round(stop0.r + (stop1.r - stop0.r) * segmentT),
          g: Math.round(stop0.g + (stop1.g - stop0.g) * segmentT),
          b: Math.round(stop0.b + (stop1.b - stop0.b) * segmentT),
          a: (stop0.a ?? 1) + ((stop1.a ?? 1) - (stop0.a ?? 1)) * segmentT
          
        };
        
      }
    }
    
    return this.colorStops[this.colorStops.length - 1];
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  // Get gradient data with RGBA
  getGradientData() {
    return this.colorStops.map(stop => ({ ...stop }));
  }
  
  // Set gradient data with RGBA
  setGradientData(stops) {
    this.colorStops = stops.map(stop => ({ ...stop }));
    this.activeStop = null;
    this.updateControls();
    this.draw();
    this.onChange(this.getGradientData());
  }
  
  // Get CSS gradient string
  getCSSGradient() {
    this.colorStops.sort((a, b) => a.t - b.t);
    const stops = this.colorStops.map(stop => 
      `rgba(${stop.r}, ${stop.g}, ${stop.b}, ${stop.a}) ${(stop.t * 100).toFixed(1)}%`
    );
    return `linear-gradient(to right, ${stops.join(', ')}`;
  }
  
  // Get Three.js compatible color array
  getThreeJSColors() {
    return this.colorStops.map(stop => ({
      position: stop.t,
      color: [stop.r / 255, stop.g / 255, stop.b / 255],
      alpha: stop.a
    }));
  }
  // getColorOverTimeFunction() {
  //   return (t) => {
  //     const color = this.getColorAt(t);
  //     const result = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
  //     result.a = color.a; // custom alpha if you want to use it elsewhere
  //     return result;
  //   };
  // }
  getColorOverTimeFunction() {
  return (t) => {
    const c = this.getColorAt(t);
    return {
      color: new THREE.Color(c.r / 255, c.g / 255, c.b / 255),
      alpha: c.a
    };
  };
}
}

// Export both classes
export { CurveEditor, GradientEditor };


