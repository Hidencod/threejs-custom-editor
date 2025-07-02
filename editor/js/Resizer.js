import { UIElement } from './libs/ui.js';

// Vertical Resizer (your existing one - resizes width)
function Resizer( editor ) {
	const signals = editor.signals;
	const dom = document.createElement( 'div' );
	dom.id = 'resizer';

	function onPointerDown( event ) {
		if ( event.isPrimary === false ) return;
		dom.ownerDocument.addEventListener( 'pointermove', onPointerMove );
		dom.ownerDocument.addEventListener( 'pointerup', onPointerUp );
	}

	function onPointerUp( event ) {
		if ( event.isPrimary === false ) return;
		dom.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
		dom.ownerDocument.removeEventListener( 'pointerup', onPointerUp );
	}

	function onPointerMove( event ) {
		if ( event.isPrimary === false ) return;

		const offsetWidth = document.body.offsetWidth;
		const clientX = event.clientX;
		const cX = clientX < 0 ? 0 : clientX > offsetWidth ? offsetWidth : clientX;
		const x = Math.max( 335, offsetWidth - cX );

		dom.style.right = x + 'px';
		document.getElementById( 'sidebar' ).style.width = x + 'px';
		document.getElementById( 'player' ).style.right = x + 'px';
		document.getElementById( 'script' ).style.right = x + 'px';
		document.getElementById( 'viewport' ).style.right = x + 'px';
		document.getElementById( 'asset-browser' ).style.right = x + 'px';
		document.getElementById( 'resizer2' ).style.right = x + 'px';

		signals.windowResize.dispatch();
	}

	dom.addEventListener( 'pointerdown', onPointerDown );
	return new UIElement( dom );
}

// Horizontal Resizer (new - resizes height)
function Resizer2( editor ) {
	const signals = editor.signals;
	const dom = document.createElement( 'div' );
	dom.id = 'resizer2';
	const bottom = window.innerHeight * 0.7;
	dom.style.bottom = bottom

	function onPointerDown( event ) {
		if ( event.isPrimary === false ) return;
		dom.ownerDocument.addEventListener( 'pointermove', onPointerMove );
		dom.ownerDocument.addEventListener( 'pointerup', onPointerUp );
	}

	function onPointerUp( event ) {
		if ( event.isPrimary === false ) return;
		dom.ownerDocument.removeEventListener( 'pointermove', onPointerMove );
		dom.ownerDocument.removeEventListener( 'pointerup', onPointerUp );
	}

	function onPointerMove(event) {
		if (event.isPrimary === false) return;

		const windowHeight = window.innerHeight;
		const clientY = event.clientY;

		const newHeight = windowHeight - clientY;
		const clampedHeight = Math.min(Math.max(newHeight, 69), 300); // Optional min/max
		const newTop = windowHeight - clampedHeight;
		dom.style.bottom = `${clampedHeight}px`;
		
		document.getElementById( 'viewport' ).style.bottom = clampedHeight + 'px';
		document.getElementById('asset-browser').style.top = newTop + 'px';

		signals.windowResize.dispatch();
	}

	dom.addEventListener( 'pointerdown', onPointerDown );
	return new UIElement( dom );
}

export { Resizer, Resizer2 };