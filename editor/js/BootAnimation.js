export function BootAnimation() {
  
  var container = document.createElement('div');
  container.id = 'boot-animation';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a237e 0%, #3f51b5 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    flex-direction: column;
  `;

  var logo = document.createElement('div');
  logo.innerHTML = `
    <div style="width: 100px; height: 100px; margin-bottom: 30px;">
      <canvas id="boot-logo-canvas" width="100" height="100"></canvas>
    </div>
    <h1 style="color: white; font-size: 2.5em; margin: 0;">Your 3D Editor</h1>
    <p style="color: #b3e5fc; margin: 10px 0;">Professional 3D Content Creation</p>
  `;

  var progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    width: 300px;
    margin-top: 40px;
  `;

  var progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
    overflow: hidden;
  `;

  var progress = document.createElement('div');
  progress.style.cssText = `
    height: 100%;
    background: linear-gradient(90deg, #00bcd4, #2196f3);
    width: 0%;
    transition: width 0.3s ease;
  `;

  var statusText = document.createElement('div');
  statusText.style.cssText = `
    color: white;
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
  `;

  progressBar.appendChild(progress);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(statusText);
  
  container.appendChild(logo);
  container.appendChild(progressContainer);
  document.body.appendChild(container);

  // Animate 3D logo
  var canvas = document.getElementById('boot-logo-canvas');
  var ctx = canvas.getContext('2d');
  var rotation = 0;

  function animateLogo() {
    ctx.clearRect(0, 0, 100, 100);
    ctx.save();
    ctx.translate(50, 50);
    ctx.rotate(rotation);
    
    // Draw 3D-looking cube
    ctx.fillStyle = '#00bcd4';
    ctx.fillRect(-20, -20, 40, 40);
    ctx.fillStyle = '#0097a7';
    ctx.fillRect(-15, -15, 30, 30);
    
    ctx.restore();
    rotation += 0.02;
    requestAnimationFrame(animateLogo);
  }
  animateLogo();

  // Loading sequence
  var stages = [
    'Initializing Three.js Engine...',
    'Loading Shaders...',
    'Setting up Scene Graph...',
    'Ready to Create!'
  ];

  var currentStage = 0;
  var currentProgress = 0;

  function updateProgress() {
    if (currentProgress < 100) {
      currentProgress += 2;
      progress.style.width = currentProgress + '%';
      statusText.textContent = stages[Math.floor(currentStage)];
      
      if (currentProgress % 25 === 0) {
        currentStage = Math.min(currentStage + 1, stages.length - 1);
      }
      
      setTimeout(updateProgress, 50);
    } else {
      setTimeout(function() {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.5s ease';
        setTimeout(function() {
          document.body.removeChild(container);
        }, 500);
      }, 1000);
    }
  }

  updateProgress();
}