class ParticleSystem extends THREE.Object3D {
  constructor(config = {}) {
    super();
    this.config = {
      particleCount: config.particleCount || 10000,
      maxLife: config.maxLife || 3,
      startSpeed: config.startSpeed || 5,
      speedVariation: config.speedVariation || 5,
      gravity: config.gravity || -9.8,
      size: config.size || 0.1,
      color: config.color || 0x66ccff,
      opacity: config.opacity || 0.8,
      emissionRate: config.emissionRate || 100,
      spread: config.spread || Math.PI / 6,
      burst: config.burst || false,
      burstCount: config.burstCount || 1000,
      updateFrequency: config.updateFrequency || 1,
      useGPUShaders: config.useGPUShaders !== false,
      
      // Unity-like features
      playOnAwake: config.playOnAwake !== false, // Default to true
      loop: config.loop !== false, // Default to true
      autoDestroy: config.autoDestroy || false, // Destroy when finished
      prewarm: config.prewarm || false, // Start with particles already emitted
      
      ...config
    };
    
    this.particleCount = this.config.particleCount;
    this.maxLife = this.config.maxLife;
    this.isPlaying = false;
    this.isPaused = false;
    this.hasStarted = false;
    this.time = 0;
    this.lastEmission = 0;
    this.isParticleSystem = true;
    this.frameCount = 0;
    
    // Performance optimization variables
    this.chunkSize = Math.min(2000, Math.ceil(this.particleCount / 8));
    this.currentChunk = 0;
    this.inactiveParticles = new Set();
    
    // Lifecycle callbacks
    this.onStart = config.onStart || null;
    this.onStop = config.onStop || null;
    this.onPause = config.onPause || null;
    this.onResume = config.onResume || null;
    
    this.initializeSystem();
    
    // Auto-play feature
    if (this.config.playOnAwake) {
      // Use setTimeout to ensure the particle system is fully initialized
      setTimeout(() => {
        this.play();
      }, 0);
    }
  }
  
  initializeSystem() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.life = new Float32Array(this.particleCount);
    this.ages = new Float32Array(this.particleCount);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    this.inactiveParticles.clear();

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, this.positions, this.velocities, false);
      this.inactiveParticles.add(i);
      this.sizes[i] = this.config.size;

      const color = new THREE.Color(this.config.color);
      this.colors[i * 3 + 0] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
    
    // Create buffer attributes with usage hints
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.velocityAttribute = new THREE.BufferAttribute(this.velocities, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);
    
    // Set usage patterns for better GPU performance
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.velocityAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttribute.setUsage(THREE.StaticDrawUsage);
    
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    
    // Use GPU shaders for better performance
    if (this.config.useGPUShaders) {
      this.createGPUMaterial();
    } else {
      this.createStandardMaterial();
    }
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.gravity = new THREE.Vector3(0, this.config.gravity, 0);
    this.add(this.points);
    
    // Prewarm feature
    if (this.config.prewarm) {
      this.prewarmSystem();
    }
  }
  
  createGPUMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: this.config.opacity },
        uSize: { value: this.config.size }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uSize;
        
        void main() {
          vColor = color;
          
          // Calculate alpha based on position (fade with distance)
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = length(mvPosition.xyz);
          vAlpha = uOpacity * (1.0 - smoothstep(0.0, 50.0, dist));
          
          // Size based on distance and individual size
          gl_PointSize = size * uSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          // Create circular particles
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          
          // Soft edges
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          alpha *= vAlpha;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
  }
  
  createStandardMaterial() {
    this.material = new THREE.PointsMaterial({
      color: this.config.color,
      size: this.config.size,
      transparent: true,
      opacity: this.config.opacity,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }
  
  prewarmSystem() {
    // Simulate the system running for one full lifecycle
    const prewarmTime = this.maxLife;
    const prewarmDelta = 0.016; // 60 FPS
    
    // Temporarily enable playing
    const wasPlaying = this.isPlaying;
    this.isPlaying = true;
    
    // Run simulation
    for (let t = 0; t < prewarmTime; t += prewarmDelta) {
      this.update(prewarmDelta);
    }
    
    // Restore playing state
    this.isPlaying = wasPlaying;
  }
  
  resetParticle(index, positions, velocities, activate = true) {
    const i3 = index * 3;
    
    // Reset position to origin
    positions[i3] = 0;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = 0;
    
    if (activate) {
      // Reset velocity with current settings
      const speed = this.config.startSpeed + Math.random() * this.config.speedVariation;
      const angle = (Math.random() - 0.5) * this.config.spread;
      const azimuth = Math.random() * Math.PI * 2;
      
      velocities[i3] = Math.sin(angle) * Math.cos(azimuth) * speed;
      velocities[i3 + 1] = Math.cos(angle) * speed;
      velocities[i3 + 2] = Math.sin(angle) * Math.sin(azimuth) * speed;
      
      this.life[index] = 0;
      this.ages[index] = 0;
      this.inactiveParticles.delete(index);
      
      // Update color based on speed for visual feedback
      const normalizedSpeed = speed / (this.config.startSpeed + this.config.speedVariation);
      const color = new THREE.Color(this.config.color);
      color.lerp(new THREE.Color(0xff4444), normalizedSpeed * 0.5);
      
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    } else {
      // Make inactive particles invisible
      this.life[index] = this.maxLife;
      this.ages[index] = 0;
    }
  }
  
  // Smooth update function - updates all particles every frame
  update(delta) {
    if (!this.isPlaying || this.isPaused) return;
    
    this.frameCount++;
    this.time += delta;
    
    // Emission logic
    if (this.config.burst) {
      if (this.time - this.lastEmission > this.maxLife) {
        this.emitBurst();
        this.lastEmission = this.time;
      }
    } else {
      const emissionInterval = 1 / this.config.emissionRate;
      const particlesToEmit = Math.floor((this.time - this.lastEmission) / emissionInterval);
      
      if (particlesToEmit > 0) {
        for (let i = 0; i < particlesToEmit && this.inactiveParticles.size > 0; i++) {
          this.emitParticle();
        }
        this.lastEmission = this.time;
      }
    }
    
    // Update ALL particles every frame for smooth motion
    const pos = this.positionAttribute.array;
    const vel = this.velocityAttribute.array;
    const colors = this.colorAttribute.array;
    
    for (let i = 0; i < this.particleCount; i++) {
      if (this.life[i] < this.maxLife) {
        this.life[i] += delta;
        this.ages[i] += delta;
        
        if (this.life[i] >= this.maxLife) {
          // Particle died
          this.life[i] = this.maxLife;
          this.inactiveParticles.add(i);
          
          // Hide dead particle
          pos[3 * i] = 0;
          pos[3 * i + 1] = 0;
          pos[3 * i + 2] = 0;
          continue;
        }
        
        const i3 = i * 3;
        
        // Apply gravity
        vel[i3 + 1] += this.gravity.y * delta;
        
        // Update position smoothly
        pos[i3] += vel[i3] * delta;
        pos[i3 + 1] += vel[i3 + 1] * delta;
        pos[i3 + 2] += vel[i3 + 2] * delta;
        
        // Update color based on age (fade out)
        const ageRatio = this.ages[i] / this.maxLife;
        const fadeRatio = 1.0 - ageRatio;
        const baseColor = new THREE.Color(this.config.color);
        
        colors[i3] = baseColor.r * fadeRatio;
        colors[i3 + 1] = baseColor.g * fadeRatio;
        colors[i3 + 2] = baseColor.b * fadeRatio;
      }
    }
    
    // Update geometry every frame
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    
    // Update shader uniforms
    if (this.config.useGPUShaders) {
      this.material.uniforms.uTime.value = this.time;
    }
    
    // Auto-destroy when finished (if not looping)
    if (this.config.autoDestroy && !this.config.loop && this.inactiveParticles.size === this.particleCount) {
      this.destroy();
    }
  }
  
  emitParticle() {
    if (this.inactiveParticles.size === 0) return;
    
    const index = this.inactiveParticles.values().next().value;
    this.resetParticle(index, this.positions, this.velocities, true);
  }
  
  emitBurst() {
    const count = Math.min(this.config.burstCount, this.inactiveParticles.size);
    const indices = Array.from(this.inactiveParticles).slice(0, count);
    
    for (const index of indices) {
      this.resetParticle(index, this.positions, this.velocities, true);
    }
  }
  
  play() {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    
    if (!this.hasStarted) {
      this.time = 0;
      this.lastEmission = 0;
      this.frameCount = 0;
      this.hasStarted = true;
      
      // Trigger onStart callback
      if (this.onStart) {
        this.onStart(this);
      }
    } else {
      // Resuming from pause
      if (this.onResume) {
        this.onResume(this);
      }
    }
    
    this.points.visible = true;
    console.log('ParticleSystem: Playing');
  }
  
  pause() {
    if (!this.isPlaying || this.isPaused) return;
    
    this.isPaused = true;
    
    if (this.onPause) {
      this.onPause(this);
    }
    
    console.log('ParticleSystem: Paused');
  }
  
  resume() {
    if (!this.isPlaying || !this.isPaused) return;
    
    this.isPaused = false;
    
    if (this.onResume) {
      this.onResume(this);
    }
    
    console.log('ParticleSystem: Resumed');
  }
  
  stop() {
    if (!this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = false;
    this.isPaused = false;
    this.hasStarted = false;
    this.time = 0;
    this.lastEmission = 0;
    this.frameCount = 0;
    
    // Reset all particles
    this.inactiveParticles.clear();
    for (let i = 0; i < this.particleCount; i++) {
      this.life[i] = this.maxLife;
      this.ages[i] = 0;
      this.inactiveParticles.add(i);
    }
    
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.points.visible = false;
    
    if (this.onStop) {
      this.onStop(this);
    }
    
    console.log('ParticleSystem: Stopped');
  }
  
  restart() {
    this.stop();
    setTimeout(() => {
      this.play();
    }, 0);
  }
  
  destroy() {
    this.stop();
    this.removeFromParent();
    
    // Clean up resources
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    
    console.log('ParticleSystem: Destroyed');
  }
  
  // State checking methods
  get isActive() {
    return this.isPlaying && !this.isPaused;
  }
  
  get isStopped() {
    return !this.isPlaying && !this.isPaused;
  }
  
  updateParticleCount(newCount) {
    this.particleCount = newCount;
    this.config.particleCount = newCount;
    this.chunkSize = Math.min(2000, Math.ceil(this.particleCount / 8));
    this.initializeSystem();
  }
  
  updateProperty(property, value) {
    this.config[property] = value;
    
    switch (property) {
      case 'playOnAwake':
        if (value && !this.hasStarted) {
          this.play();
        }
        break;
      case 'size':
        if (this.config.useGPUShaders) {
          this.material.uniforms.uSize.value = value;
        } else {
          this.material.size = value;
        }
        break;
      case 'color':
        if (!this.config.useGPUShaders) {
          this.material.color.setHex(value);
        }
        break;
      case 'opacity':
        if (this.config.useGPUShaders) {
          this.material.uniforms.uOpacity.value = value;
        } else {
          this.material.opacity = value;
        }
        break;
      case 'gravity':
        this.gravity.y = value;
        break;
      case 'maxLife':
        this.maxLife = value;
        break;
    }
  }
  
  getObject3D() {
    return this;
  }
  
  // Performance monitoring
  getPerformanceStats() {
    const activeParticles = this.particleCount - this.inactiveParticles.size;
    return {
      particleCount: this.particleCount,
      activeParticles: activeParticles,
      inactiveParticles: this.inactiveParticles.size,
      updateFrequency: this.config.updateFrequency,
      chunkSize: this.chunkSize,
      currentChunk: this.currentChunk,
      utilization: (activeParticles / this.particleCount * 100).toFixed(1) + '%',
      state: this.isActive ? 'Playing' : this.isPaused ? 'Paused' : 'Stopped'
    };
  }
  
  toJSON(meta) {
    const data = super.toJSON(meta);
    data.object.userData.particleSystem = true;
    data.object.userData.config = this.config;
    return data;
  }
}