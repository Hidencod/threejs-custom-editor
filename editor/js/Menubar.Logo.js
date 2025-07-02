import * as THREE from 'three';

import { UIImage,UIPanel } from './libs/ui.js';


function MenubarLogo( editor ) {

	const strings = editor.strings;
    const path = "./images/logo.png"
	const container = new UIImage(path)
                .setStyle('width', ['32px'])
                .setStyle('height', ['32px'])
                .setStyle('objectFit', ['cover'])
                .setStyle('borderRadius', ['2px']);
	container.setClass( 'menu-logo' );
    
    
    
	

	return container;

}

export { MenubarLogo };
