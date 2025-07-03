// LifetimeProperties.js
function createLifetimeArray(count, maxLife = 3) {
  const life = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    life[i] = Math.random() * maxLife;
  }
  return life;
}
export{createLifetimeArray}