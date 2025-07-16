// ParticleSystemRegistry.js

const particleSystemMap = new Map();

/**
 * Registers a ParticleSystem instance to the registry.
 * @param {string|number} id - Unique ID.
 * @param {object} system - The ParticleSystem instance.
 */
function registerParticleSystem(id, system) {
  particleSystemMap.set(id, system);
  console.log(particleSystemMap)
}

/**
 * Gets a ParticleSystem instance by ID.
 * @param {string|number} id
 * @returns {object|undefined}
 */
function getParticleSystem(id) {
  return particleSystemMap.get(id);
}

/**
 * Removes a system from the registry.
 * @param {string|number} id
 */
function removeParticleSystem(id) {
  particleSystemMap.delete(id);
}

/**
 * Clears the entire registry (optional, for cleanup).
 */
function clearParticleSystems() {
  particleSystemMap.clear();
}

export {
  particleSystemMap,
  registerParticleSystem,
  getParticleSystem,
  removeParticleSystem,
  clearParticleSystems
};
