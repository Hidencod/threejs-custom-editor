// InitialProperties.js
function createInitialParticleData(count) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const speed = 5 + Math.random() * 5;
    const angle = (Math.random() - 0.5) * Math.PI / 6;
    velocities[3 * i] = Math.sin(angle) * (Math.random() - 0.5) * 2;
    velocities[3 * i + 1] = speed;
    velocities[3 * i + 2] = Math.cos(angle) * (Math.random() - 0.5) * 2;

    positions[3 * i] = 0;
    positions[3 * i + 1] = 0;
    positions[3 * i + 2] = 0;
  }

  return { positions, velocities };
}
export{createInitialParticleData}