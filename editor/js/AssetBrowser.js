// AssetBrowser.js
import { UISpan, UIDiv, UIImage, UIText } from './libs/ui.js';

function AssetBrowser(editor) {
	const container = new UISpan().setId('asset-browser');

	// Apply dynamic inline styles instead of CSS
	container.setStyle('position', ['absolute'])
	.setStyle('bottom', ['0'])
	.setStyle('left', ['0'])  
	.setStyle('right', ['200px'])// Match sidebar width!
	.setStyle('height', ['150px'])
	.setStyle('background', ['#222'])
	.setStyle('borderTop', ['1px solid #444'])
	.setStyle('overflow', ['auto'])
	.setStyle('zIndex', ['10']);


	const title = new UIText('Assets')
		.setMargin('10px')
		.setColor('#fff');

	const grid = new UIDiv()
		.setClass('asset-grid')
		.setStyle('display', ['flex'])
		.setStyle('flexWrap', ['wrap'])
		.setStyle('gap', ['10px']);

	const assets = ['wood.jpg'];

	assets.forEach(asset => {
		const item = new UIDiv().setClass('asset-item');
		if (asset.endsWith('.jpg')) {
			const img = new UIImage(`assets/${asset}`).setWidth('64px').setHeight('64px');
			item.add(img);
		} else {
			item.setTextContent(asset);
		}
		grid.add(item);
	});

	container.add(title, grid);

	return container;
}

export { AssetBrowser };
