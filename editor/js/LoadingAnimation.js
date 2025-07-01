let container, progress, statusText;

function injectStyles() {
  if (document.getElementById('boot-animation-styles')) return;
  const style = document.createElement('style');
  style.id = 'boot-animation-styles';
  style.textContent = `
    @keyframes fadeIn {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.95); }
    }
    .boot-popup {
      background: rgba(15, 23, 42, 0.95);
      padding: 40px 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      text-align: center;
      max-width: 400px;
      width: 90%;
      animation: fadeIn 0.3s ease;
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .boot-title {
      font-size: 1.6rem;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .boot-subtitle {
      font-size: 1rem;
      color: #94a3b8;
      margin-bottom: 20px;
    }
    .boot-progress-track {
      background: #334155;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 10px;
      width: 100%;
    }
    .boot-progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(to right, #38bdf8, #3b82f6);
      transition: width 0.3s ease;
    }
    .boot-status {
      font-size: 0.85rem;
      color: #cbd5e1;
    }
  `;
  document.head.appendChild(style);
}

function show() {
  hide();
  injectStyles();
  container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.background = 'transparent';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.zIndex = '10000';
  container.style.flexDirection = 'column';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.pointerEvents = 'none';

  const popup = document.createElement('div');
  popup.className = 'boot-popup';
  popup.style.pointerEvents = 'auto';

  const title = document.createElement('div');
  title.className = 'boot-title';
  title.textContent = 'Loading Assets';

  const subtitle = document.createElement('div');
  subtitle.className = 'boot-subtitle';
  subtitle.textContent = 'Just a moment...';

  const track = document.createElement('div');
  track.className = 'boot-progress-track';

  progress = document.createElement('div');
  progress.className = 'boot-progress-bar';
  track.appendChild(progress);

  statusText = document.createElement('div');
  statusText.className = 'boot-status';
  statusText.textContent = 'Loading...';

  popup.appendChild(title);
  popup.appendChild(subtitle);
  popup.appendChild(track);
  popup.appendChild(statusText);
  container.appendChild(popup);
  document.body.appendChild(container);
}

function setProgress(percent, text) {
  if (!container || !progress) return;
  const clamped = Math.max(0, Math.min(100, percent));
  progress.style.width = clamped + '%';
  if (text) statusText.textContent = text;
}

function hide() {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    container = null;
    progress = null;
    statusText = null;
  }
}

export const LoadingAnimation = { show, hide, setProgress }; 