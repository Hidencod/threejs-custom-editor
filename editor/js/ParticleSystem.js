// Enhanced ParticleSystem.js with more properties
import * as THREE from 'three';

class ParticleSystem extends THREE.Object3D {
  constructor(config = {}) {
    super();
    this.config = {
      particleCount: config.particleCount || 1000,
      maxLife: config.maxLife || 3,
      startSpeed: config.startSpeed || 5,
      speedVariation: config.speedVariation || 5,
      gravity: config.gravity || -9.8,
      size: config.size || 0.1,
      color: config.color || 0x66ccff,
      opacity: config.opacity || 0.8,
      emissionRate: config.emissionRate || 1,
      spread: config.spread || Math.PI / 6,
      burst: config.burst || false,
      burstCount: config.burstCount || 100,
      ...config
    };
    
    this.particleCount = this.config.particleCount;
    this.maxLife = this.config.maxLife;
    this.isPlaying = false;
    this.time = 0;
    this.lastEmission = 0;
    this.isParticleSystem=true;
    this.initializeSystem();
  }
  
  initializeSystem() {
    this.geometry = new THREE.BufferGeometry();
    const { positions, velocities } = this.createInitialParticleData();
    this.positions = positions;
    this.velocities = velocities;
    this.life = this.createLifetimeArray();
    this.ages = new Float32Array(this.particleCount);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
    
    this.material = new THREE.PointsMaterial({
      color: this.config.color,
      size: this.config.size,
      transparent: true,
      opacity: this.config.opacity,
      vertexColors: false
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.gravity = new THREE.Vector3(0, this.config.gravity, 0);
    this.add(this.points);
  }
  
  createInitialParticleData() {
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);
    
    for (let i = 0; i < this.particleCount; i++) {
      // Start all particles as inactive
      this.resetParticle(i, positions, velocities, false);
    }
    
    return { positions, velocities };
  }
  
  createLifetimeArray() {
    const life = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      life[i] = this.maxLife; // Start inactive
    }
    return life;
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
    }
  }
  
  update(delta) {
    if (!this.isPlaying) return;
    
    this.time += delta;
    const pos = this.geometry.getAttribute('position');
    const vel = this.geometry.getAttribute('velocity');
    
    // Emission logic
    if (this.config.burst) {
      // Burst mode - emit all at once
      if (this.time - this.lastEmission > this.maxLife) {
        this.emitBurst();
        this.lastEmission = this.time;
      }
    } else {
      // Continuous emission
      const emissionInterval = 1 / this.config.emissionRate;
      if (this.time - this.lastEmission >= emissionInterval) {
        this.emitParticle();
        this.lastEmission = this.time;
      }
    }
    
    // Update existing particles
    for (let i = 0; i < this.particleCount; i++) {
      if (this.life[i] < this.maxLife) {
        this.life[i] += delta;
        this.ages[i] += delta;
        
        if (this.life[i] >= this.maxLife) {
          // Particle died
          this.life[i] = this.maxLife;
          continue;
        }
        
        // Apply gravity
        vel.array[3 * i + 1] += this.gravity.y * delta;
        
        // Update position
        pos.array[3 * i] += vel.array[3 * i] * delta;
        pos.array[3 * i + 1] += vel.array[3 * i + 1] * delta;
        pos.array[3 * i + 2] += vel.array[3 * i + 2] * delta;
      }
    }
    
    pos.needsUpdate = true;
    vel.needsUpdate = true;
  }
  
  emitParticle() {
    // Find an inactive particle
    for (let i = 0; i < this.particleCount; i++) {
      if (this.life[i] >= this.maxLife) {
        this.resetParticle(i, this.positions, this.velocities, true);
        break;
      }
    }
  }
  
  emitBurst() {
    const count = Math.min(this.config.burstCount, this.particleCount);
    let emitted = 0;
    
    for (let i = 0; i < this.particleCount && emitted < count; i++) {
      if (this.life[i] >= this.maxLife) {
        this.resetParticle(i, this.positions, this.velocities, true);
        emitted++;
      }
    }
  }
  
  play() {
    this.isPlaying = true;
    this.time = 0;
    this.lastEmission = 0;
    this.points.visible = true;
  }
  
  pause() {
    this.isPlaying = false;
  }
  
  stop() {
    this.isPlaying = false;
    this.time = 0;
    this.lastEmission = 0;
    // Reset all particles
    for (let i = 0; i < this.particleCount; i++) {
      this.life[i] = this.maxLife;
      this.ages[i] = 0;
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.points.visible = false;
  }
  
  // Property update methods
  updateParticleCount(newCount) {
    this.particleCount = newCount;
    this.config.particleCount = newCount;
    this.initializeSystem();
  }
  
  updateProperty(property, value) {
    this.config[property] = value;
    
    switch (property) {
      case 'size':
        this.material.size = value;
        break;
      case 'color':
        this.material.color.setHex(value);
        break;
      case 'opacity':
        this.material.opacity = value;
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
  toJSON(meta) {
  const data = super.toJSON(meta);

  data.object.userData.particleSystem = true; // Flag so we can detect it later
  data.object.userData.config = this.config;  // Store config for reconstruction

  return data;
}
}
export{ParticleSystem}