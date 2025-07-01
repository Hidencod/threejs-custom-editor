const BootAnimation = (() => {
  let container, progress, statusText, mode;
  let showTimestamp = 0;
  const minShowTime = 1500;

  function injectStyles() {
    if (document.getElementById("boot-animation-styles")) return;

    const style = document.createElement("style");
    style.id = "boot-animation-styles";
    style.textContent = `
      @keyframes fadeIn {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes fadeOut {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.95); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }

      .boot-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(circle at center, #0f172a, #020617);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        flex-direction: column;
        font-family: 'Segoe UI', sans-serif;
        animation: fadeIn 0.5s ease-out forwards;
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
      }

      .boot-logo {
        width: 80px;
        height: 80px;
        margin-bottom: 20px;
        animation: pulse 2s infinite ease-in-out;
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

    if (document.getElementById('boot-animation-keyframes')) return;
    const styleKeyframes = document.createElement('style');
    styleKeyframes.id = 'boot-animation-keyframes';
    styleKeyframes.textContent = `
      @keyframes boot-title-fadein {
        0% { opacity: 0; transform: translateY(12px) scale(0.98); filter: blur(2px); }
        60% { opacity: 1; transform: translateY(-2px) scale(1.01); filter: blur(0); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }
      @keyframes boot-subtitle-fadein {
        0% { opacity: 0; transform: translateY(8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes boot-cube-bouncein {
        0% { transform: scale(0.92) rotateX(-30deg) rotateY(30deg); opacity: 0; }
        60% { transform: scale(1.04) rotateX(5deg) rotateY(-5deg); opacity: 1; }
        100% { transform: scale(1) rotateX(0deg) rotateY(0deg); opacity: 1; }
      }
      .boot-logo {
        animation: boot-logo-rotate 2.5s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
        display: block;
        margin: 0 auto 24px auto;
        width: 72px;
        height: 72px;
        will-change: transform;
      }
      @keyframes boot-logo-rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleKeyframes);
  }

  function create() {
  injectStyles();
  container = document.createElement("div");
  container.className = "boot-container";

  if (mode === "startup") {
    const logo = document.createElement("img");
    logo.className = "boot-logo";
    logo.src = "images/logo.png";
    logo.alt = "MakeIt3D";

    const title = document.createElement("div");
    title.className = "boot-title";
    title.textContent = "Launching MakeIt3D Editor";

    const subtitle = document.createElement("div");
    subtitle.className = "boot-subtitle";
    subtitle.textContent = "Building your 3D space...";

    container.appendChild(logo);
    container.appendChild(title);
    container.appendChild(subtitle);

  } else if (mode === "asset") {
    const popup = document.createElement("div");
    popup.className = "boot-popup";

    const title = document.createElement("div");
    title.className = "boot-title";
    title.textContent = "Loading Assets";

    const subtitle = document.createElement("div");
    subtitle.className = "boot-subtitle";
    subtitle.textContent = "Just a moment...";

    const track = document.createElement("div");
    track.className = "boot-progress-track";

    progress = document.createElement("div");
    progress.className = "boot-progress-bar";
    track.appendChild(progress);

    statusText = document.createElement("div");
    statusText.className = "boot-status";
    statusText.textContent = "Loading...";

    popup.appendChild(title);
    popup.appendChild(subtitle);
    popup.appendChild(track);
    popup.appendChild(statusText);
    container.appendChild(popup);
  }

  document.body.appendChild(container);
  setContainerStyle(); // ✅ <--- Make sure this is called
  showTimestamp = Date.now();
}


  function setProgress(percent, text) {
    if (!container || !progress) return;
    const clamped = Math.max(0, Math.min(100, percent));
    progress.style.width = clamped + "%";
    if (text) statusText.textContent = text;
  }

  function show(inputMode = "startup") {
    mode = inputMode;
    if (container && container.parentNode) container.remove();
    create();
  }

  function hide() {
    const elapsed = Date.now() - showTimestamp;
    const doHide = () => {
      if (container) {
        container.style.animation = "fadeOut 0.5s ease-in forwards";
        setTimeout(() => {
          if (container && container.parentNode) container.remove();
          container = null;
        }, 500);
      }
    };
    if (elapsed < minShowTime) {
      setTimeout(doHide, minShowTime - elapsed);
    } else {
      doHide();
    }
  }

 function setContainerStyle() {
  if (!container) return;

  if (mode === 'asset')  {
    // Asset loading popup — transparent background
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      flex-direction: column;
      margin: 0;
      padding: 0;
      pointer-events: none;
    `;

    if (container.firstChild) {
      const popup = container.firstChild;
      popup.style.background = "rgba(15, 23, 42, 0.9)";
      popup.style.backdropFilter = "blur(10px)";
      popup.style.borderRadius = "12px";
      popup.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)";
      popup.style.pointerEvents = "auto";
      popup.style.padding = "24px 16px";
      popup.style.minWidth = "280px";
      popup.style.minHeight = "120px";
    }
  }
}


  return { show, hide, setProgress };
})();
export { BootAnimation };
