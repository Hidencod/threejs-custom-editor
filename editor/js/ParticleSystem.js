// Enhanced ParticleSystem.js with Play On Awake feature
import * as THREE from 'three';

class ParticleSystem extends THREE.Object3D {
  constructor(config = {}) {
    super();
    this.config = {
      particleCount: config.particleCount || 10000,
      maxLife: config.maxLife || 3,
      startSpeed: config.startSpeed || 5,
      speedVariation: config.speedVariation || 5,
      gravity: config.gravity || -9.8,
      size: config.size || 1,
      color: config.color || 0x66ccff,
      opacity: config.opacity || 0.8,
      emissionRate: config.emissionRate || 100,
      spread: config.spread || Math.PI / 6,
      burst: config.burst || false,
      burstCount: config.burstCount || 1000,
      updateFrequency: config.updateFrequency || 1,
      useGPUShaders: config.useGPUShaders !== false,
      useSizeOverTime: config.useSizeOverTime ?? false,
  useColorOverTime: config.useColorOverTime ?? false,
      // Simulation Space - Unity-like feature
      simulationSpace: config.simulationSpace || 'Local', // 'Local' or 'World'

      // Unity-like features
      playOnAwake: config.playOnAwake !== false,
      autoDestroy: config.autoDestroy || false,
      prewarm: config.prewarm || false,
      duration: config.duration || 5.0,
      stopAction: config.stopAction || 'None',
      onEmissionComplete: config.onEmissionComplete || null,
      onLoop: config.onLoop || null,

      ...config
    };
    // Convert curves into runtime functions
    if (this.config.sizeOverTimeCurve) {
      this.sizeOverTime = (t) => interpolateCurve(t, this.config.sizeOverTimeCurve);
    }
    this.colorOverTime = (t) => {
  const p = interpolateColorCurve(t, this.config.colorOverTimeCurve);
  return {
    color: new THREE.Color(p.r / 255, p.g / 255, p.b / 255),
    alpha: p.a
  };
};
    // if (this.config.colorOverTimeCurve) {
    //   this.colorOverTime = (t) => {
    //     const point = interpolateColorCurve(t, this.config.colorOverTimeCurve);
    //     //console.log(point)
    //     return {
    //       color: new THREE.Color(point.color),
    //       alpha: point.a
    //     };
    //   };
    // }
    this.particleCount = this.config.particleCount;
    this.maxLife = this.config.maxLife;
    this.isPlaying = false;
    this.isPaused = false;
    this.hasStarted = false;
    this.time = 0;
    this.lastEmission = 0;
    this.isParticleSystem = true;
    this.frameCount = 0;
    this.useColorOverTime = this.config.useColorOverTime||false;
    this.useSizeOverTime = this.config.useSizeOverTime||false;
    // World space tracking
    this.worldPositionMatrix = new THREE.Matrix4();
    this.worldPosition = new THREE.Vector3();
    this.worldRotation = new THREE.Quaternion();
    this.worldScale = new THREE.Vector3();
    this.previousWorldPosition = new THREE.Vector3();
    this.previousWorldRotation = new THREE.Quaternion();
    this.previousWorldScale = new THREE.Vector3();

    // Performance optimization variables
    this.chunkSize = Math.min(2000, Math.ceil(this.particleCount / 8));
    this.currentChunk = 0;
    this.inactiveParticles = new Set();

    // Lifecycle callbacks
    this.onStart = config.onStart || null;
    this.onStop = config.onStop || null;
    this.onPause = config.onPause || null;
    this.onResume = config.onResume || null;
    this.onSimulationSpaceChanged = config.onSimulationSpaceChanged || null;

    this.emissionTime = 0;      // Time spent emitting
    this.isEmitting = false;    // Whether we're currently emitting
    this.hasFinishedEmission = false; // Whether emission phase is complete
    this.initializeSystem();

    // Auto-play feature
    if (this.config.playOnAwake) {
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
    this.alphas = new Float32Array(this.particleCount);

    // World space positions (for world space simulation)
    this.worldPositions = new Float32Array(this.particleCount * 3);
    this.worldVelocities = new Float32Array(this.particleCount * 3);

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
    this.alphaAttribute = new THREE.BufferAttribute(this.alphas, 1)
    // Set usage patterns for better GPU performance
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.velocityAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    this.alphaAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    this.geometry.setAttribute('alpha', this.alphaAttribute);

    // Use GPU shaders for better performance
    this.createGPUMaterial();

    this.points = new THREE.Points(this.geometry, this.material);
    this.gravity = new THREE.Vector3(0, this.config.gravity, 0);
    this.add(this.points);

    // Initialize world space tracking
    this.updateWorldTransform();
    this.previousWorldPosition.copy(this.worldPosition);
    this.previousWorldRotation.copy(this.worldRotation);
    this.previousWorldScale.copy(this.worldScale);

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
        uSize: { value: this.config.size },
        uBaseColor: { value: new THREE.Color(this.config.color) }
      },
      vertexShader: `
      uniform vec3 uBaseColor;
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uSize;
        
        void main() {
          vColor = color * uBaseColor;
          vAlpha = alpha * uOpacity; // Combine per-particle alpha with global opacity
          
          // Size based on distance and individual size
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
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
          alpha *= vAlpha; // Apply per-particle alpha
          
          // Early discard for very transparent particles
          if (alpha < 0.001) discard;
          
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

  updateWorldTransform() {
    if (this.parent) {
      this.worldPositionMatrix.multiplyMatrices(this.parent.matrixWorld, this.matrix);
    } else {
      this.worldPositionMatrix.copy(this.matrix);
    }

    this.worldPositionMatrix.decompose(this.worldPosition, this.worldRotation, this.worldScale);
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

    if (activate) {
      // Reset position based on simulation space
      if (this.config.simulationSpace === 'World') {
        // Start at world position of the emitter
        this.worldPositions[i3] = this.worldPosition.x;
        this.worldPositions[i3 + 1] = this.worldPosition.y;
        this.worldPositions[i3 + 2] = this.worldPosition.z;

        // Convert to local space for rendering
        const localPos = new THREE.Vector3(0, 0, 0);
        this.worldToLocal(localPos);
        positions[i3] = localPos.x;
        positions[i3 + 1] = localPos.y;
        positions[i3 + 2] = localPos.z;
      } else {
        // Local space - start at origin
        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;

        this.worldPositions[i3] = 0;
        this.worldPositions[i3 + 1] = 0;
        this.worldPositions[i3 + 2] = 0;
      }

      // Reset velocity with current settings
      const speed = this.config.startSpeed + Math.random() * this.config.speedVariation;
      const angle = (Math.random() - 0.5) * this.config.spread;
      const azimuth = Math.random() * Math.PI * 2;

      const localVel = new THREE.Vector3(
        Math.sin(angle) * Math.cos(azimuth) * speed,
        Math.cos(angle) * speed,
        Math.sin(angle) * Math.sin(azimuth) * speed
      );

      if (this.config.simulationSpace === 'World') {
        // Transform velocity to world space
        const worldVel = localVel.clone();
        worldVel.applyQuaternion(this.worldRotation);

        this.worldVelocities[i3] = worldVel.x;
        this.worldVelocities[i3 + 1] = worldVel.y;
        this.worldVelocities[i3 + 2] = worldVel.z;

        velocities[i3] = localVel.x;
        velocities[i3 + 1] = localVel.y;
        velocities[i3 + 2] = localVel.z;
      } else {
        // Local space
        velocities[i3] = localVel.x;
        velocities[i3 + 1] = localVel.y;
        velocities[i3 + 2] = localVel.z;

        this.worldVelocities[i3] = localVel.x;
        this.worldVelocities[i3 + 1] = localVel.y;
        this.worldVelocities[i3 + 2] = localVel.z;
      }

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
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      this.worldPositions[i3] = 0;
      this.worldPositions[i3 + 1] = 0;
      this.worldPositions[i3 + 2] = 0;

      this.life[index] = this.maxLife;
      this.ages[index] = 0;
    }
  }

  update(delta) {
    if (!this.isPlaying || this.isPaused) return;

    this.frameCount++;
    this.time += delta;

    // Update emission state
    if (!this.hasFinishedEmission) {
      this.emissionTime += delta;
      this.isEmitting = true;
      // Check if emission duration is complete
      if (!this.config.loop && this.emissionTime >= this.config.duration) {
        this.isEmitting = false;
        this.hasFinishedEmission = true;
        this.isPaused = false;
        this.hasStarted = false;

        // Trigger callback if defined
        if (this.config.onEmissionComplete) {
          this.config.onEmissionComplete(this);
        }
      }
    }

    // Handle looping
    if (this.config.loop && this.emissionTime >= this.config.duration) {
      this.emissionTime = 0;
      this.hasFinishedEmission = false;
      this.isEmitting = true;
      this.lastEmission = this.time;

      // Trigger loop callback if defined
      if (this.config.onLoop) {
        this.config.onLoop(this, ++this.loopCount);
      }
    }

    // Update world transform
    this.updateWorldTransform();

    // Emission logic - only emit if we're in emission phase
    if (this.isEmitting) {
      if (this.config.burst) {
        // Burst at start of emission
        if (this.emissionTime < delta) {
          this.emitBurst();
        }
      } else {
        // Continuous emission
        const emissionInterval = 1 / this.config.emissionRate;
        const particlesToEmit = Math.floor((this.time - this.lastEmission) / emissionInterval);

        if (particlesToEmit > 0) {
          for (let i = 0; i < particlesToEmit && this.inactiveParticles.size > 0; i++) {
            this.emitParticle();
          }
          this.lastEmission = this.time;
        }
      }
    }

    // Update ALL particles every frame for smooth motion
    const pos = this.positionAttribute.array;
    const vel = this.velocityAttribute.array;
    const colors = this.colorAttribute.array;
    const sizes = this.sizeAttribute.array;
    const alphas = this.alphaAttribute.array;

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

        if (this.config.simulationSpace === 'World') {
          // World space simulation

          // Apply gravity in world space
          this.worldVelocities[i3 + 1] += this.gravity.y * delta;

          // Update world position
          this.worldPositions[i3] += this.worldVelocities[i3] * delta;
          this.worldPositions[i3 + 1] += this.worldVelocities[i3 + 1] * delta;
          this.worldPositions[i3 + 2] += this.worldVelocities[i3 + 2] * delta;

          // Convert world position to local space for rendering
          const worldPos = new THREE.Vector3(
            this.worldPositions[i3],
            this.worldPositions[i3 + 1],
            this.worldPositions[i3 + 2]
          );

          const localPos = worldPos.clone();
          this.worldToLocal(localPos);

          pos[i3] = localPos.x;
          pos[i3 + 1] = localPos.y;
          pos[i3 + 2] = localPos.z;

        } else {
          // Local space simulation

          // Apply gravity in local space
          vel[i3 + 1] += this.gravity.y * delta;

          // Update position in local space
          pos[i3] += vel[i3] * delta;
          pos[i3 + 1] += vel[i3 + 1] * delta;
          pos[i3 + 2] += vel[i3 + 2] * delta;
        }

        // Calculate lifecycle progress
        const ageRatio = this.ages[i] / this.maxLife;
        const t = this.life[i] / this.maxLife;

        // Apply size over time if defined
        if (this.sizeOverTime && this.useSizeOverTime) {
          sizes[i] = this.sizeOverTime(t);
        }

        // Apply color over time if defined
        if (this.colorOverTime&&this.useColorOverTime) {
          const { color, alpha } = this.colorOverTime(t);
          colors[i3] = color.r;
          colors[i3 + 1] = color.g;
          colors[i3 + 2] = color.b;
          alphas[i] = alpha;
          //console.log('ColorOverTime →',color.r,color.g, color.b, alpha);
          console.log('not fading')
        } else {
          // Default color fade based on age
          const fadeRatio = 1.0 - ageRatio;
          const baseColor = new THREE.Color(this.config.color);

          colors[i3] = baseColor.r * fadeRatio;
          colors[i3 + 1] = baseColor.g * fadeRatio;
          colors[i3 + 2] = baseColor.b * fadeRatio;
          alphas[i] = this.config.opacity * fadeRatio;
          
          console.log('fading')
        }
      }
    }

    // Update geometry every frame
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;

    // Update shader uniforms
    if (this.config.useGPUShaders) {
      this.material.uniforms.uTime.value = this.time;
    }

    // Store previous world transform for next frame
    this.previousWorldPosition.copy(this.worldPosition);
    this.previousWorldRotation.copy(this.worldRotation);
    this.previousWorldScale.copy(this.worldScale);

    // Handle stop action when emission is done and no particles remain
    if (this.hasFinishedEmission && !this.config.loop) {
      const activeParticles = this.particleCount - this.inactiveParticles.size;

      if (activeParticles === 0) {
        switch (this.config.stopAction) {
          case 'Disable':
            this.stop();
            break;
          case 'Destroy':
            this.destroy();
            break;
          case 'None':
          default:
            // Do nothing, keep system alive but not emitting
            break;
        }
      }
    }

    // Auto-destroy when finished (legacy behavior - now handled by stopAction)
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

  // Simulation Space Control
  setSimulationSpace(space) {
    if (space !== 'Local' && space !== 'World') {
      console.warn('Invalid simulation space. Use "Local" or "World"');
      return;
    }

    const oldSpace = this.config.simulationSpace;
    this.config.simulationSpace = space;

    if (oldSpace !== space) {
      // Convert existing particles to new space
      this.convertParticleSpace(oldSpace, space);

      if (this.onSimulationSpaceChanged) {
        this.onSimulationSpaceChanged(this, oldSpace, space);
      }
    }
  }

  convertParticleSpace(fromSpace, toSpace) {
    const pos = this.positionAttribute.array;
    const vel = this.velocityAttribute.array;

    for (let i = 0; i < this.particleCount; i++) {
      if (this.life[i] < this.maxLife) {
        const i3 = i * 3;

        if (fromSpace === 'Local' && toSpace === 'World') {
          // Convert local to world
          const localPos = new THREE.Vector3(pos[i3], pos[i3 + 1], pos[i3 + 2]);
          const worldPos = localPos.clone();
          this.localToWorld(worldPos);

          this.worldPositions[i3] = worldPos.x;
          this.worldPositions[i3 + 1] = worldPos.y;
          this.worldPositions[i3 + 2] = worldPos.z;

          // Convert velocity
          const localVel = new THREE.Vector3(vel[i3], vel[i3 + 1], vel[i3 + 2]);
          const worldVel = localVel.clone();
          worldVel.applyQuaternion(this.worldRotation);

          this.worldVelocities[i3] = worldVel.x;
          this.worldVelocities[i3 + 1] = worldVel.y;
          this.worldVelocities[i3 + 2] = worldVel.z;

        } else if (fromSpace === 'World' && toSpace === 'Local') {
          // Convert world to local
          const worldPos = new THREE.Vector3(
            this.worldPositions[i3],
            this.worldPositions[i3 + 1],
            this.worldPositions[i3 + 2]
          );

          const localPos = worldPos.clone();
          this.worldToLocal(localPos);

          pos[i3] = localPos.x;
          pos[i3 + 1] = localPos.y;
          pos[i3 + 2] = localPos.z;

          // Convert velocity
          const worldVel = new THREE.Vector3(
            this.worldVelocities[i3],
            this.worldVelocities[i3 + 1],
            this.worldVelocities[i3 + 2]
          );

          const localVel = worldVel.clone();
          const inverseRotation = this.worldRotation.clone().invert();
          localVel.applyQuaternion(inverseRotation);

          vel[i3] = localVel.x;
          vel[i3 + 1] = localVel.y;
          vel[i3 + 2] = localVel.z;
        }
      }
    }

    this.positionAttribute.needsUpdate = true;
  }

  // Getter for simulation space
  get simulationSpace() {
    return this.config.simulationSpace;
  }

  // Toggle between Local and World space
  toggleSimulationSpace() {
    const newSpace = this.config.simulationSpace === 'Local' ? 'World' : 'Local';
    this.setSimulationSpace(newSpace);
  }

  play() {
    if (this.isPlaying && this.isPaused) return;

    this.isPlaying = true;
    this.isPaused = false;

    if (!this.hasStarted) {
      this.time = 0;
      this.lastEmission = 0;
      this.frameCount = 0;
      this.hasStarted = true;
      this.hasFinishedEmission = false;
      this.isEmitting = true;
      this.emissionTime = 0;
      this.loopCount = 0;
      // Update world transform
      this.updateWorldTransform();
      this.previousWorldPosition.copy(this.worldPosition);
      this.previousWorldRotation.copy(this.worldRotation);
      this.previousWorldScale.copy(this.worldScale);

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
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;

    this.isPaused = true;

    if (this.onPause) {
      this.onPause(this);
    }

  }

  resume() {
    if (!this.isPlaying || !this.isPaused) return;

    this.isPaused = false;

    if (this.onResume) {
      this.onResume(this);
    }

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

  }

  // Add helper methods:
  isEmissionComplete() {
    return this.hasFinishedEmission;
  }

  getEmissionProgress() {
    return this.config.duration > 0 ? Math.min(this.emissionTime / this.config.duration, 1.0) : 1.0;
  }

  getRemainingEmissionTime() {
    return Math.max(0, this.config.duration - this.emissionTime);
  }

  // Override restart to reset emission state:
  restart() {
    this.emissionTime = 0;
    this.hasFinishedEmission = false;
    this.isEmitting = false;
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
      if (value && !this.hasStarted) this.play();
      break;

    case 'simulationSpace':
      this.setSimulationSpace(value);
      break;

    case 'size':
      if (this.config.useGPUShaders) {
        this.material.uniforms.uSize.value = value;
      } else {
        this.material.size = value;
      }
      break;

    case 'color':
      if (this.config.useGPUShaders) {
    // Update default fallback color in shader (if supported)
    if (this.material.uniforms?.uBaseColor) {
      this.material.uniforms.uBaseColor.value.setHex(value);
    }
  } else {
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

    case 'particleCount':
      this.updateParticleCount(value);
      break;

    // No runtime logic needed, but persist these
    case 'emissionRate':
    case 'burst':
    case 'burstCount':
    case 'startSpeed':
    case 'speedVariation':
    case 'spread':
    case 'duration':
    case 'loop':
    case 'autoDestroy':
    case 'prewarm':
    case 'stopAction':
    case 'updateFrequency':
    case 'useGPUShaders':
      // value already saved to config
      break;

    default:
      console.warn(`Unhandled property: ${property}`);
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
      simulationSpace: this.config.simulationSpace,
      updateFrequency: this.config.updateFrequency,
      chunkSize: this.chunkSize,
      currentChunk: this.currentChunk,
      utilization: (activeParticles / this.particleCount * 100).toFixed(1) + '%',
      state: this.isActive ? 'Playing' : this.isPaused ? 'Paused' : 'Stopped'
    };
  }

  toJSON(meta) {
  const base = super.toJSON(meta);
  const data = base.object;

  data.type = 'ParticleSystem';
  data.config = { ...this.config };

  return base;
}

  static fromJSON(data) {
  const system = new ParticleSystem(data.config);

  system.uuid = data.uuid;
  system.name = data.name;

  if (Array.isArray(data.position)) system.position.fromArray(data.position);
  if (Array.isArray(data.rotation)) system.rotation.fromArray(data.rotation);
  if (Array.isArray(data.scale))    system.scale.fromArray(data.scale);

  if (data.config.sizeOverTimeCurve) {
    system.config.sizeOverTimeCurve = data.config.sizeOverTimeCurve;
    system.sizeOverTime = (t) => interpolateCurve(t, data.config.sizeOverTimeCurve);
  }

  if (data.config.colorOverTimeCurve) {
  system.config.colorOverTimeCurve = data.config.colorOverTimeCurve;
  console.log(data.config.colorOverTimeCurve)
 system.colorOverTime = (t) => {
  const p = interpolateColorCurve(t, system.config.colorOverTimeCurve);
  return {
    color: new THREE.Color(p.r / 255, p.g / 255, p.b / 255),
    alpha: p.a
  };
};
}


  return system;
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


export { ParticleSystem };

// Usage examples:
/*
// Auto-play particle system (default behavior)
const particles1 = new ParticleSystem({
  particleCount: 5000,
  playOnAwake: true  // Default
});

// Manual control particle system
const particles2 = new ParticleSystem({
  particleCount: 5000,
  playOnAwake: false,
  onStart: (system) => console.log('Started!'),
  onStop: (system) => console.log('Stopped!')
});
particles2.play(); // Must call manually

// Prewarm system (starts with particles already active)
const particles3 = new ParticleSystem({
  particleCount: 5000,
  playOnAwake: true,
  prewarm: true
});

// Burst system with auto-destroy
const particles4 = new ParticleSystem({
  particleCount: 1000,
  burst: true,
  loop: false,
  autoDestroy: true,
  playOnAwake: true
});
*/