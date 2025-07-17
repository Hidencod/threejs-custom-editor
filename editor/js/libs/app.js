import { registerParticleSystem,getParticleSystem } from "../ParticleSystem.Registery.js";
import { ParticleSystem } from "../ParticleSystem.js";
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
var APP = {

	Player: function () {

		var renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio ); // TODO: Use player.setPixelRatio()

		var loader = new THREE.ObjectLoader();
		var camera, scene;

		var events = {};

		var dom = document.createElement( 'div' );
		dom.appendChild( renderer.domElement );

		this.dom = dom;
		this.canvas = renderer.domElement;

		this.width = 500;
		this.height = 500;

		this.load = function ( json ) {

			var project = json.project;

			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;
			
			this.setScene( loader.parse( json.scene ) );
			this.setCamera( loader.parse( json.camera ) );
			if (json.environment && typeof json.environment === 'string') {
				const envName = json.environment.toLowerCase();
				const pmremGenerator = new THREE.PMREMGenerator(renderer);
				switch (envName) {


					case 'background':

						useBackgroundAsEnvironment = true;

						if (scene.background !== null && scene.background.isTexture) {

							scene.environment = scene.background;
							scene.environment.mapping = THREE.EquirectangularReflectionMapping;
							scene.environmentRotation.y = scene.backgroundRotation.y;

						}

						break;

					case 'equirectangular':

						if (environmentEquirectangularTexture) {

							scene.environment = environmentEquirectangularTexture;
							scene.environment.mapping = THREE.EquirectangularReflectionMapping;

						}

						break;

					case 'room':

						scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

						break;

				}
			}
			

			events = {
				init: [],
				start: [],
				stop: [],
				keydown: [],
				keyup: [],
				pointerdown: [],
				pointerup: [],
				pointermove: [],
				update: []
			};

			var scriptWrapParams = 'player,renderer,scene,camera';
			var scriptWrapResultObj = {};

			for ( var eventKey in events ) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[ eventKey ] = eventKey;

			}

			var scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

			for ( var uuid in json.scripts ) {

				var object = scene.getObjectByProperty( 'uuid', uuid, true );

				if ( object === undefined ) {

					console.warn( 'APP.Player: Script without object.', uuid );
					continue;

				}

				var scripts = json.scripts[ uuid ];

				for ( var i = 0; i < scripts.length; i ++ ) {

					var script = scripts[ i ];

					var functions = ( new Function( scriptWrapParams, script.source + '\nreturn ' + scriptWrapResult + ';' ).bind( object ) )( this, renderer, scene, camera );

					for ( var name in functions ) {

						if ( functions[ name ] === undefined ) continue;

						if ( events[ name ] === undefined ) {

							console.warn( 'APP.Player: Event type not supported (', name, ')' );
							continue;

						}

						events[ name ].push( functions[ name ].bind( object ) );

					}

				}

			}

			dispatch( events.init, arguments );

		};

		this.setCamera = function ( value ) {

			camera = value;
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		};

		this.setScene = function ( value ) {

			scene = value;
			
			scene.traverse(child => {
				console.log(child)
				if (
					child.userData &&
					(child.userData.type === 'ParticleSystem' || child.userData.name === 'ParticleSystem')
				) {
					const parent = child.parent;
					const index = parent.children.indexOf(child);

					// ✅ Create real ParticleSystem instance
					const particleSystem = ParticleSystem.fromJSON(child.userData);

					// ✅ Copy transforms
					particleSystem.position.copy(child.position);
					particleSystem.rotation.copy(child.rotation);
					particleSystem.scale.copy(child.scale);

					// ✅ Maintain name, uuid, etc.
					particleSystem.name = child.name;
					particleSystem.uuid = child.uuid;

					// ✅ Replace in scene
					parent.children[index] = particleSystem;
					particleSystem.parent = parent;
					console.log(particleSystem instanceof ParticleSystem)
					particleSystem.play();
					// Optional: dispose of old child if needed
				}
			});

		};
		
		this.setPixelRatio = function ( pixelRatio ) {

			renderer.setPixelRatio( pixelRatio );

		};

		this.setSize = function ( width, height ) {

			this.width = width;
			this.height = height;

			if ( camera ) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			renderer.setSize( width, height );

		};

		function dispatch( array, event ) {

			for ( var i = 0, l = array.length; i < l; i ++ ) {

				array[ i ]( event );

			}

		}

		var time, startTime, prevTime;

		function animate() {

			time = performance.now();

			try {

				dispatch( events.update, { time: time - startTime, delta: time - prevTime } );

			} catch ( e ) {

				console.error( ( e.message || e ), ( e.stack || '' ) );

			}

			try {

				dispatch(events.update, { time: time - startTime, delta: time - prevTime });

			} catch (e) {

				console.error((e.message || e), (e.stack || ''));

			}
			try {
				
				scene.traverse(child => {
					if (child instanceof ParticleSystem) {
						child.update((time - prevTime) / 1000);
					}
				});

			} catch (e) {
				console.error((e.message || e), (e.stack || ''));
			}




			renderer.render( scene, camera );

			prevTime = time;

		}

		this.play = function () {

			startTime = prevTime = performance.now();

			document.addEventListener( 'keydown', onKeyDown );
			document.addEventListener( 'keyup', onKeyUp );
			document.addEventListener( 'pointerdown', onPointerDown );
			document.addEventListener( 'pointerup', onPointerUp );
			document.addEventListener( 'pointermove', onPointerMove );

			dispatch( events.start, arguments );

			renderer.setAnimationLoop( animate );
			

		};

		this.stop = function () {

			document.removeEventListener( 'keydown', onKeyDown );
			document.removeEventListener( 'keyup', onKeyUp );
			document.removeEventListener( 'pointerdown', onPointerDown );
			document.removeEventListener( 'pointerup', onPointerUp );
			document.removeEventListener( 'pointermove', onPointerMove );

			dispatch( events.stop, arguments );

			renderer.setAnimationLoop( null );

		};

		this.render = function ( time ) {

			dispatch( events.update, { time: time * 1000, delta: 0 /* TODO */ } );

			renderer.render( scene, camera );

		};

		this.dispose = function () {

			renderer.dispose();

			camera = undefined;
			scene = undefined;

		};

		//

		function onKeyDown( event ) {

			dispatch( events.keydown, event );

		}

		function onKeyUp( event ) {

			dispatch( events.keyup, event );

		}

		function onPointerDown( event ) {

			dispatch( events.pointerdown, event );

		}

		function onPointerUp( event ) {

			dispatch( events.pointerup, event );

		}

		function onPointerMove( event ) {

			dispatch( events.pointermove, event );

		}

	}

};

export { APP };
