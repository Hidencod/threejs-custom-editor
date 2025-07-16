import { UIElement, UIPanel, UIText } from './libs/ui.js';
import { SetScriptValueCommand } from './commands/SetScriptValueCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';

// Game Engine Runtime Classes
class Input {
	static keys = {};
	static mouse = { x: 0, y: 0, buttons: {} };
	static touches = [];

	static isKeyPressed(key) {
		return this.keys[key] === true;
	}

	static isKeyJustPressed(key) {
		return this.keys[key] === 'justPressed';
	}

	static isKeyJustReleased(key) {
		return this.keys[key] === 'justReleased';
	}

	static getMousePosition() {
		return { x: this.mouse.x, y: this.mouse.y };
	}

	static isMouseButtonPressed(button) {
		return this.mouse.buttons[button] === true;
	}

	static getTouchCount() {
		return this.touches.length;
	}

	static getTouch(index) {
		return this.touches[index];
	}
}

class Time {
	static deltaTime = 0;
	static time = 0;
	static frameCount = 0;
	static timeScale = 1;

	static getDeltaTime() {
		return this.deltaTime * this.timeScale;
	}

	static getTime() {
		return this.time;
	}

	static getFrameCount() {
		return this.frameCount;
	}
}

class GameEngine {
	constructor() {
		this.scripts = new Map();
		this.lastTime = 0;
		this.isRunning = false;
		this.setupInputListeners();
	}

	setupInputListeners() {
		// Keyboard input
		document.addEventListener('keydown', (e) => {
			if (Input.keys[e.code] !== true) {
				Input.keys[e.code] = 'justPressed';
			}
		});

		document.addEventListener('keyup', (e) => {
			Input.keys[e.code] = 'justReleased';
		});

		// Mouse input
		document.addEventListener('mousemove', (e) => {
			Input.mouse.x = e.clientX;
			Input.mouse.y = e.clientY;
		});

		document.addEventListener('mousedown', (e) => {
			Input.mouse.buttons[e.button] = true;
		});

		document.addEventListener('mouseup', (e) => {
			Input.mouse.buttons[e.button] = false;
		});

		// Touch input
		document.addEventListener('touchstart', (e) => {
			Input.touches = Array.from(e.touches);
		});

		document.addEventListener('touchmove', (e) => {
			Input.touches = Array.from(e.touches);
		});

		document.addEventListener('touchend', (e) => {
			Input.touches = Array.from(e.touches);
		});
	}

	registerScript(id, scriptInstance) {
		this.scripts.set(id, scriptInstance);

		// Call awake immediately
		if (scriptInstance.awake) {
			scriptInstance.awake();
		}
	}

	startScript(id) {
		const script = this.scripts.get(id);
		if (script && script.start && !script._started) {
			script.start();
			script._started = true;
		}
	}

	removeScript(id) {
		const script = this.scripts.get(id);
		if (script && script.onDestroy) {
			script.onDestroy();
		}
		this.scripts.delete(id);
	}

	startEngine() {
		this.isRunning = true;
		this.lastTime = performance.now();
		this.gameLoop();
	}

	stopEngine() {
		this.isRunning = false;
	}

	gameLoop() {
		if (!this.isRunning) return;

		const currentTime = performance.now();
		Time.deltaTime = (currentTime - this.lastTime) / 1000;
		Time.time += Time.deltaTime;
		Time.frameCount++;
		this.lastTime = currentTime;

		// Update all scripts
		for (const [id, script] of this.scripts) {
			if (script.update && script._started) {
				try {
					script.update();
				} catch (error) {
					console.error(`Error in script ${id} update:`, error);
				}
			}
		}

		// Update input states
		this.updateInputStates();

		requestAnimationFrame(() => this.gameLoop());
	}

	updateInputStates() {
		// Reset just pressed/released states
		for (const key in Input.keys) {
			if (Input.keys[key] === 'justPressed') {
				Input.keys[key] = true;
			} else if (Input.keys[key] === 'justReleased') {
				delete Input.keys[key];
			}
		}
	}
}

// Global game engine instance
const gameEngine = new GameEngine();

function Script(editor) {
	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId('script');
	container.setPosition('absolute');
	container.setBackgroundColor('#272822');
	container.setDisplay('none');

	const header = new UIPanel();
	header.setPadding('10px');
	container.add(header);

	const title = new UIText().setColor('#fff');
	header.add(title);

	// Control buttons
	const controlPanel = new UIPanel();
	controlPanel.setPosition('absolute');
	controlPanel.setTop('10px');
	controlPanel.setRight('40px');
	controlPanel.dom.style.display = 'flex';
	controlPanel.dom.style.gap = '5px';
	header.add(controlPanel);

	// Play button
	const playButton = new UIElement(document.createElement('button'));
	playButton.dom.textContent = '▶';
	playButton.dom.style.backgroundColor = '#4CAF50';
	playButton.dom.style.color = 'white';
	playButton.dom.style.border = 'none';
	playButton.dom.style.padding = '5px 10px';
	playButton.dom.style.cursor = 'pointer';
	playButton.onClick(() => {
		gameEngine.startEngine();
		executeCurrentScript();
	});
	controlPanel.add(playButton);

	// Stop button
	const stopButton = new UIElement(document.createElement('button'));
	stopButton.dom.textContent = '⏹';
	stopButton.dom.style.backgroundColor = '#f44336';
	stopButton.dom.style.color = 'white';
	stopButton.dom.style.border = 'none';
	stopButton.dom.style.padding = '5px 10px';
	stopButton.dom.style.cursor = 'pointer';
	stopButton.onClick(() => {
		gameEngine.stopEngine();
	});
	controlPanel.add(stopButton);

	const buttonSVG = (function () {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', 32);
		svg.setAttribute('height', 32);
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M 12,12 L 22,22 M 22,12 12,22');
		path.setAttribute('stroke', '#fff');
		svg.appendChild(path);
		return svg;
	})();

	const close = new UIElement(buttonSVG);
	close.setPosition('absolute');
	close.setTop('3px');
	close.setRight('1px');
	close.setCursor('pointer');
	close.onClick(function () {
		container.setDisplay('none');
	});
	header.add(close);

	let renderer;
	let delay;
	let currentMode;
	let currentScript;
	let currentObject;

	signals.rendererCreated.add(function (newRenderer) {
		renderer = newRenderer;
	});

	// Game script template
	const gameScriptTemplate = `// Game Script Template
// Import game engine classes
// Available classes: Input, Time, gameEngine

class MyGameScript {
    constructor() {
        // Initialize your variables here
        this.speed = 5;
        this.position = { x: 0, y: 0, z: 0 };
    }

    // Called once when script is first created
    awake() {
        console.log('Script awakened!');
        // Initialize references to other objects
        // Set up initial state
    }

    // Called once before the first frame update
    start() {
        console.log('Script started!');
        // Initialize game logic
        // Set up initial values that depend on other scripts being ready
    }

    // Called once per frame
    update() {
        // Game logic goes here
        
        // Example: Move object with arrow keys
        if (Input.isKeyPressed('ArrowLeft')) {
            this.position.x -= this.speed * Time.getDeltaTime();
        }
        if (Input.isKeyPressed('ArrowRight')) {
            this.position.x += this.speed * Time.getDeltaTime();
        }
        if (Input.isKeyPressed('ArrowUp')) {
            this.position.z -= this.speed * Time.getDeltaTime();
        }
        if (Input.isKeyPressed('ArrowDown')) {
            this.position.z += this.speed * Time.getDeltaTime();
        }

        // Example: Handle mouse input
        if (Input.isMouseButtonPressed(0)) {
            const mousePos = Input.getMousePosition();
            console.log('Mouse clicked at:', mousePos);
        }

        // Example: Check for key just pressed
        if (Input.isKeyJustPressed('Space')) {
            console.log('Space key was just pressed!');
        }

        // Update object position if it has a position property
        if (this.object && this.object.position) {
            this.object.position.set(this.position.x, this.position.y, this.position.z);
        }
    }

    // Called when script is destroyed
    onDestroy() {
        console.log('Script destroyed!');
        // Clean up resources
    }
}

// Export the script instance
return new MyGameScript();`;

	const codemirror = CodeMirror(container.dom, {
		value: gameScriptTemplate,
		lineNumbers: true,
		matchBrackets: true,
		indentWithTabs: true,
		tabSize: 4,
		indentUnit: 4,
		hintOptions: {
			completeSingle: false
		}
	});

	codemirror.setOption('theme', 'monokai');
	codemirror.on('change', function () {
		if (codemirror.state.focused === false) return;

		clearTimeout(delay);
		delay = setTimeout(function () {
			const value = codemirror.getValue();
			if (!validate(value)) return;

			if (typeof (currentScript) === 'object') {
				if (value !== currentScript.source) {
					editor.execute(new SetScriptValueCommand(editor, currentObject, currentScript, 'source', value));
				}
				return;
			}

			// Handle other script types (shaders, etc.)
			if (currentScript !== 'programInfo') return;

			const json = JSON.parse(value);
			// Handle material updates...
		}, 300);
	});

	// Execute current script
	function executeCurrentScript() {
		const code = codemirror.getValue();

		try {
			// Create a safe execution context
			const context = {
				Input,
				Time,
				gameEngine,
				console,
				performance,
				requestAnimationFrame,
				cancelAnimationFrame
			};

			// Create function with controlled scope
			const scriptFunction = new Function(
				'Input', 'Time', 'gameEngine', 'console', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
				code
			);

			// Execute script and get instance
			const scriptInstance = scriptFunction(
				context.Input,
				context.Time,
				context.gameEngine,
				context.console,
				context.performance,
				context.requestAnimationFrame,
				context.cancelAnimationFrame
			);

			if (scriptInstance && typeof scriptInstance === 'object') {
				// Link script to current object
				scriptInstance.object = currentObject;

				// Register script in game engine
				const scriptId = currentObject.uuid + '_script';
				gameEngine.registerScript(scriptId, scriptInstance);
				gameEngine.startScript(scriptId);

				console.log('Script executed successfully!');
			} else {
				console.error('Script must return an object instance');
			}
		} catch (error) {
			console.error('Script execution error:', error);
		}
	}

	// Enhanced validation for game scripts
	const errorLines = [];
	const widgets = [];

	const validate = function (string) {
		let valid;
		let errors = [];

		return codemirror.operation(function () {
			// Clear previous errors
			while (errorLines.length > 0) {
				codemirror.removeLineClass(errorLines.shift(), 'background', 'errorLine');
			}

			while (widgets.length > 0) {
				codemirror.removeLineWidget(widgets.shift());
			}

			// Validate JavaScript syntax
			try {
				const syntax = esprima.parse(string, { tolerant: true });
				errors = syntax.errors;
			} catch (error) {
				errors.push({
					lineNumber: error.lineNumber - 1,
					message: error.message
				});
			}

			// Check for required game script structure
			if (currentMode === 'javascript') {
				if (!string.includes('class ') && !string.includes('function ')) {
					errors.push({
						lineNumber: 0,
						message: 'Game script should define a class or return an object with awake(), start(), and update() methods'
					});
				}
			}

			// Display errors
			for (let i = 0; i < errors.length; i++) {
				const error = errors[i];
				error.message = error.message.replace(/Line [0-9]+: /, '');

				const message = document.createElement('div');
				message.className = 'esprima-error';
				message.textContent = error.message;

				const lineNumber = Math.max(error.lineNumber, 0);
				errorLines.push(lineNumber);

				codemirror.addLineClass(lineNumber, 'background', 'errorLine');
				const widget = codemirror.addLineWidget(lineNumber, message);
				widgets.push(widget);
			}

			return errors.length === 0;
		});
	};

	// Enhanced autocomplete for game engine
	const server = new CodeMirror.TernServer({
		caseInsensitive: true,
		plugins: {
			threejs: null,
			gameengine: {
				Input: {
					isKeyPressed: 'fn(key: string) -> bool',
					isKeyJustPressed: 'fn(key: string) -> bool',
					isKeyJustReleased: 'fn(key: string) -> bool',
					getMousePosition: 'fn() -> {x: number, y: number}',
					isMouseButtonPressed: 'fn(button: number) -> bool'
				},
				Time: {
					getDeltaTime: 'fn() -> number',
					getTime: 'fn() -> number',
					getFrameCount: 'fn() -> number'
				}
			}
		}
	});

	codemirror.setOption('extraKeys', {
		'Ctrl-Space': function (cm) { server.complete(cm); },
		'Ctrl-I': function (cm) { server.showType(cm); },
		'Ctrl-O': function (cm) { server.showDocs(cm); },
		'Alt-.': function (cm) { server.jumpToDef(cm); },
		'Alt-,': function (cm) { server.jumpBack(cm); },
		'Ctrl-Q': function (cm) { server.rename(cm); },
		'Ctrl-.': function (cm) { server.selectName(cm); },
		'Ctrl-Enter': function (cm) { executeCurrentScript(); }
	});

	// Rest of the original functionality...
	signals.editorCleared.add(function () {
		container.setDisplay('none');
		gameEngine.stopEngine();
	});

	function setTitle(object, script) {
		if (typeof script === 'object') {
			title.setValue(object.name + ' / ' + script.name + ' (Game Script)');
		} else {
			switch (script) {
				case 'gameScript':
					title.setValue(object.name + ' / Game Script');
					break;
				case 'vertexShader':
					title.setValue(object.material.name + ' / ' + strings.getKey('script/title/vertexShader'));
					break;
				case 'fragmentShader':
					title.setValue(object.material.name + ' / ' + strings.getKey('script/title/fragmentShader'));
					break;
				case 'programInfo':
					title.setValue(object.material.name + ' / ' + strings.getKey('script/title/programInfo'));
					break;
				default:
					title.setValue(object.name + ' / Script');
			}
		}
	}

	signals.editScript.add(function (object, script) {
		let mode, source;

		if (typeof (script) === 'object') {
			mode = 'javascript';
			// Use game script template for new scripts or if source is empty/generic
			if (!script.source || script.source.trim() === '' || script.source.includes('function update( event )')) {
				source = gameScriptTemplate;
			} else {
				source = script.source;
			}
		} else {
			switch (script) {
				case 'gameScript':
					mode = 'javascript';
					source = gameScriptTemplate;
					break;
				case 'vertexShader':
					mode = 'glsl';
					source = object.material.vertexShader || '';
					break;
				case 'fragmentShader':
					mode = 'glsl';
					source = object.material.fragmentShader || '';
					break;
				case 'programInfo':
					mode = 'json';
					const json = {
						defines: object.material.defines,
						uniforms: object.material.uniforms,
						attributes: object.material.attributes
					};
					source = JSON.stringify(json, null, '\t');
					break;
				default:
					mode = 'javascript';
					source = gameScriptTemplate;
			}
		}

		setTitle(object, script);
		currentMode = mode;
		currentScript = script;
		currentObject = object;

		container.setDisplay('');
		codemirror.setValue(source);
		codemirror.clearHistory();

		if (mode === 'json') mode = { name: 'javascript', json: true };
		codemirror.setOption('mode', mode);
	});

	// Handle script removal
	signals.scriptRemoved.add(function (script) {
		if (currentScript === script) {
			container.setDisplay('none');
		}

		// Remove from game engine
		if (currentObject) {
			const scriptId = currentObject.uuid + '_script';
			gameEngine.removeScript(scriptId);
		}
	});

	return container;
}

// Export classes for use in other modules
export { Script, Input, Time, GameEngine };