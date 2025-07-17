// AssetBrowser.js
import { UISpan, UIDiv, UIImage, UIText, UIInput, UIButton } from './libs/ui.js';

function AssetBrowser(editor) {
    const container = new UISpan().setId('asset-browser');
    const signals = editor.signals;
    // State management
    let currentAssets = [];
    let filteredAssets = [];
    let selectedAsset = null;
    let searchQuery = '';
    let isExpanded = false;
    let currentHeight = 250;
    let currentFolder = 'root';
    let folderStructure = {};
    let selectedFolder = 'Assets';
    
    // Asset types configuration
    const assetTypes = {
        models: { extensions: ['.gltf', '.glb', '.fbx', '.obj', '.dae'], icon: '🎨' },
        textures: { extensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tga', '.hdr', '.exr'], icon: '🖼️' },
        materials: { extensions: ['.mtl', '.mat'], icon: '🎭' },
        audio: { extensions: ['.mp3', '.wav', '.ogg'], icon: '🔊' },
        videos: { extensions: ['.mp4', '.webm', '.ogv'], icon: '🎬' },
        scripts: { extensions: ['.js', '.json'], icon: '📜' }
    };
    
    // Apply dynamic inline styles
    container.setStyle('position', ['absolute'])
        .setStyle('bottom', ['0'])
        .setStyle('left', ['0'])
        .setStyle('right', ['350px']) // Match sidebar width
        .setStyle('top', ['70vh'])
        .setStyle('background', ['#1a1a1a'])
        .setStyle('borderTop', ['1px solid #444'])
        .setStyle('borderRight', ['1px solid #444'])
        .setStyle('overflow', ['hidden'])
        .setStyle('zIndex', ['10'])
        .setStyle('transition', ['height 0.3s ease'])
        .setStyle('display', ['flex'])
        .setStyle('flexDirection', ['column'])

    // Header section
    const header = new UIDiv()
        .setStyle('display', ['flex'])
        .setStyle('alignItems', ['center'])
        .setStyle('justifyContent', ['space-between'])
        .setStyle('padding', ['10px 12px'])
        .setStyle('borderBottom', ['1px solid #333'])
        .setStyle('backgroundColor', ['#252525'])
        .setStyle('minHeight', ['45px'])
        .setStyle('flexShrink', ['0']);

    // Controls section
    const controls = new UIDiv()
        .setStyle('display', ['flex'])
        .setStyle('alignItems', ['center'])
        .setStyle('gap', ['8px']);

    const searchInput = new UIInput()
        .setPlaceholder('Search assets...')
        .setStyle('background', ['#333'])
        .setStyle('border', ['1px solid #555'])
        .setStyle('color', ['#fff'])
        .setStyle('padding', ['4px 8px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('fontSize', ['12px'])
        .setStyle('width', ['150px']);

    const refreshButton = new UIButton('🔄')
        .setStyle('background', ['#444'])
        .setStyle('border', ['1px solid #666'])
        .setStyle('color', ['#fff'])
        .setStyle('cursor', ['pointer'])
        .setStyle('padding', ['4px 8px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('fontSize', ['12px']);

    controls.add(searchInput);
    controls.add(refreshButton);

    // Main content area with split layout
    const mainContent = new UIDiv()
        .setStyle('flex', ['1'])
        .setStyle('display', ['flex'])
        .setStyle('overflow', ['hidden']);

    // Left panel - Folder tree
    const leftPanel = new UIDiv()
        .setStyle('width', ['200px'])
        .setStyle('minWidth', ['150px'])
        .setStyle('backgroundColor', ['#222'])
        .setStyle('borderRight', ['1px solid #444'])
        .setStyle('overflow', ['auto'])
        .setStyle('display', ['flex'])
        .setStyle('flexDirection', ['column']);

    const folderHeader = new UIDiv()
        .setStyle('padding', ['8px 12px'])
        .setStyle('borderBottom', ['1px solid #333'])
        .setStyle('backgroundColor', ['#2a2a2a'])
        .setStyle('fontSize', ['12px'])
        .setStyle('color', ['#ccc'])
        .setStyle('fontWeight', ['bold']);

    folderHeader.add(new UIText('Folders'));

    const folderTree = new UIDiv()
        .setStyle('flex', ['1'])
        .setStyle('padding', ['8px 0'])
        .setStyle('overflow', ['auto']);

    leftPanel.add(folderHeader, folderTree);

    // Splitter
    const splitter = new UIDiv()
        .setStyle('width', ['4px'])
        .setStyle('backgroundColor', ['#333'])
        .setStyle('cursor', ['col-resize'])
        .setStyle('position', ['relative']);

    // Right panel - Asset contents
    const rightPanel = new UIDiv()
        .setStyle('flex', ['1'])
        .setStyle('display', ['flex'])
        .setStyle('flexDirection', ['column'])
        .setStyle('overflow', ['hidden']);

    // Content area
    const content = new UIDiv()
        .setStyle('flex', ['1'])
        .setStyle('overflow', ['auto'])
        .setStyle('position', ['relative']);

    // Asset grid
    const grid = new UIDiv()
        .setStyle('display', ['grid'])
        .setStyle('gridTemplateColumns', ['repeat(auto-fill, minmax(80px, 1fr))'])
        .setStyle('gap', ['8px'])
        .setStyle('padding', ['12px'])
        .setStyle('height', ['fit-content'])
        .setStyle('minHeight', ['100px']);

    // Drop zone overlay
    const dropZone = new UIDiv()
        .setStyle('position', ['absolute'])
        .setStyle('top', ['0'])
        .setStyle('left', ['0'])
        .setStyle('right', ['0'])
        .setStyle('bottom', ['0'])
        .setStyle('backgroundColor', ['rgba(0, 136, 255, 0.1)'])
        .setStyle('border', ['2px dashed #0088ff'])
        .setStyle('display', ['none'])
        .setStyle('alignItems', ['center'])
        .setStyle('justifyContent', ['center'])
        .setStyle('fontSize', ['14px'])
        .setStyle('color', ['#0088ff'])
        .setStyle('fontWeight', ['bold'])
        .setStyle('zIndex', ['100']);

    dropZone.add(new UIText('Drop files here to upload'));

    content.add(grid, dropZone);
    rightPanel.add(content);

    // Asset context menu
    const contextMenu = new UIDiv()
        .setStyle('position', ['absolute'])
        .setStyle('background', ['#333'])
        .setStyle('border', ['1px solid #555'])
        .setStyle('borderRadius', ['4px'])
        .setStyle('padding', ['4px 0'])
        .setStyle('display', ['none'])
        .setStyle('zIndex', ['1000'])
        .setStyle('boxShadow', ['0 4px 12px rgba(0,0,0,0.5)']);

    const contextMenuItems = [
        { label: 'Add to Scene', action: 'add' },
        { label: 'Preview', action: 'preview' },
        { label: 'Properties', action: 'properties' },
        { label: 'Duplicate', action: 'duplicate' },
        { label: 'Delete', action: 'delete' }
    ];

    contextMenuItems.forEach(item => {
        const menuItem = new UIButton(item.label)
            .setStyle('display', ['block'])
            .setStyle('width', ['100%'])
            .setStyle('background', ['none'])
            .setStyle('border', ['none'])
            .setStyle('color', ['#fff'])
            .setStyle('padding', ['6px 12px'])
            .setStyle('textAlign', ['left'])
            .setStyle('cursor', ['pointer'])
            .setStyle('fontSize', ['11px']);

        menuItem.onMouseOver(() => {
            menuItem.setStyle('backgroundColor', ['#444']);
        });

        menuItem.onMouseOut(() => {
            menuItem.setStyle('backgroundColor', ['transparent']);
        });

        menuItem.onClick(() => {
            handleContextMenuAction(item.action, selectedAsset);
            contextMenu.setStyle('display', ['none']);
        });

        contextMenu.add(menuItem);
    });

    // Notification system
    const notification = new UIDiv()
        .setStyle('position', ['fixed'])
        .setStyle('bottom', ['30px'])
        .setStyle('left', ['50%'])
        .setStyle('transform', ['translateX(-50%)'])
        .setStyle('background', ['#222'])
        .setStyle('color', ['#fff'])
        .setStyle('padding', ['10px 24px'])
        .setStyle('borderRadius', ['6px'])
        .setStyle('boxShadow', ['0 2px 12px rgba(0,0,0,0.2)'])
        .setStyle('fontSize', ['13px'])
        .setStyle('zIndex', ['9999'])
        .setStyle('display', ['none']);
    container.add(notification);

    // --- Folder Context Menu ---
    const folderContextMenu = new UIDiv()
        .setStyle('position', ['absolute'])
        .setStyle('background', ['#333'])
        .setStyle('border', ['1px solid #555'])
        .setStyle('borderRadius', ['4px'])
        .setStyle('padding', ['4px 0'])
        .setStyle('display', ['none'])
        .setStyle('zIndex', ['1000'])
        .setStyle('boxShadow', ['0 4px 12px rgba(0,0,0,0.5)']);
    container.add(folderContextMenu);

    // Submenu for 'Create'
    const createSubMenu = new UIDiv()
        .setStyle('position', ['absolute'])
        .setStyle('left', ['100%'])
        .setStyle('top', ['0'])
        .setStyle('background', ['#222'])
        .setStyle('border', ['1px solid #555'])
        .setStyle('borderRadius', ['4px'])
        .setStyle('padding', ['4px 0'])
        .setStyle('display', ['none'])
        .setStyle('zIndex', ['1001']);
    folderContextMenu.add(createSubMenu);

    // Helper: build folder path
    function buildFolderPath(parentPath, folderName) {
        if (!parentPath || parentPath === 'root') return 'Assets/' + folderName;
        return parentPath + '/' + folderName;
    }

    // Initialize folder structure with unique paths
    folderStructure = {
        root: {
            name: 'Assets',
            path: 'Assets',
            type: 'folder',
            children: {
                Models: { name: 'Models', path: 'Assets/Models', type: 'folder', children: {} },
                Textures: { name: 'Textures', path: 'Assets/Textures', type: 'folder', children: {} },
                Materials: { name: 'Materials', path: 'Assets/Materials', type: 'folder', children: {} },
                Audio: { name: 'Audio', path: 'Assets/Audio', type: 'folder', children: {} },
                Scripts: { name: 'Scripts', path: 'Assets/Scripts', type: 'folder', children: {} }
            }
        }
    };

    // Use full folder paths in sample assets
    const sampleAssets = [
        { name: 'wood_texture.jpg', type: 'textures', size: '2.1 MB', path: 'assets/wood.jpg', folder: 'Assets/Textures' },
        { name: 'metal_material.mtl', type: 'materials', size: '0.5 KB', path: 'assets/metal_material.mtl', folder: 'Assets/Materials' },
        { name: 'chair_model.glb', type: 'models', size: '15.2 MB', path: 'assets/chair_model.glb', folder: 'Assets/Models' },
        { name: 'ambient_sound.mp3', type: 'audio', size: '3.8 MB', path: 'assets/ambient_sound.mp3', folder: 'Assets/Audio' },
        { name: 'script_helper.js', type: 'scripts', size: '1.2 KB', path: 'assets/script_helper.js', folder: 'Assets/Scripts' },
        { name: 'readme.txt', type: 'scripts', size: '0.2 KB', path: 'assets/readme.txt', folder: 'Assets' }
    ];
    
    // Update renderFolderTree to use folder.path for navigation
    function renderFolderTree() {
        folderTree.clear();
        function createFolderItem(folder, level = 0) {
            const item = new UIDiv()
                .setStyle('display', ['flex'])
                .setStyle('alignItems', ['center'])
                .setStyle('padding', [`4px ${8 + level * 16}px`])
                .setStyle('cursor', ['pointer'])
                .setStyle('fontSize', ['12px'])
                .setStyle('color', [selectedFolder === folder.path ? '#0088ff' : '#ccc'])
                .setStyle('borderLeft', [selectedFolder === folder.path ? '3px solid #0088ff' : '3px solid transparent'])
                .setStyle('backgroundColor', [selectedFolder === folder.path ? '#333' : 'transparent']);
            item.dom.setAttribute('tabindex', '0');
            item.dom.setAttribute('role', 'treeitem');
            item.dom.setAttribute('aria-label', folder.name);
            if (selectedFolder === folder.path) item.dom.setAttribute('aria-selected', 'true');
            else item.dom.removeAttribute('aria-selected');
            const icon = new UIText(level === 0 ? '📁' : '📂')
                .setStyle('marginRight', ['6px'])
                .setStyle('fontSize', ['11px']);
            const label = new UIText(folder.name)
                .setStyle('fontSize', ['11px']);
            item.add(icon, label);
            item.onMouseOver(() => {
                if (selectedFolder !== folder.path) {
                    item.setStyle('backgroundColor', ['#2a2a2a']);
                }
            });
            item.onMouseOut(() => {
                if (selectedFolder !== folder.path) {
                    item.setStyle('backgroundColor', ['transparent']);
                }
            });
            item.onClick(() => {
                selectFolder(folder.path, item);
            });
            // Keyboard navigation for folders
            item.dom.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    selectFolder(folder.path, item);
                    e.preventDefault();
                }
                // Up/down navigation
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    const siblings = Array.from(folderTree.dom.childNodes);
                    const idx = siblings.indexOf(item.dom);
                    let nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
                    if (nextIdx >= 0 && nextIdx < siblings.length) {
                        siblings[nextIdx].focus();
                    }
                    e.preventDefault();
                }
            });
            folderTree.add(item);
            // Add child folders
            if (folder.children) {
                Object.values(folder.children).forEach(childFolder => {
                    createFolderItem(childFolder, level + 1);
                });
            }
        }
        createFolderItem(folderStructure.root, 0);
    }

    // Update selectFolder to use path
    function selectFolder(folderPath, itemElement) {
        // Clear previous selection
        folderTree.dom.childNodes.forEach(child => {
            child.style.color = '#ccc';
            child.style.borderLeft = '3px solid transparent';
            child.style.backgroundColor = 'transparent';
        });
        // Select current
        selectedFolder = folderPath;
        if (itemElement) {
            itemElement.setStyle('color', ['#0088ff'])
                .setStyle('borderLeft', ['3px solid #0088ff'])
                .setStyle('backgroundColor', ['#333']);
        }
        filterAssets();
    }

    // Update renderAssets to use folder.path for navigation
    function renderAssets() {
        grid.clear();
        // Find the selected folder object by path
        function findFolderByPath(node, path) {
            if (node.path === path) return node;
            if (node.children) {
                for (const key in node.children) {
                    const found = findFolderByPath(node.children[key], path);
                    if (found) return found;
                }
            }
            return null;
        }
        const currentFolderObj = findFolderByPath(folderStructure.root, selectedFolder);
        // List child folders (if any)
        let childFolders = [];
        if (currentFolderObj && currentFolderObj.children) {
            childFolders = Object.values(currentFolderObj.children);
        }
        // Render folders first
        childFolders.forEach(folder => {
            const folderItem = new UIDiv()
                .setStyle('position', ['relative'])
                .setStyle('background', ['#222'])
                .setStyle('border', ['1px solid #444'])
                .setStyle('borderRadius', ['4px'])
                .setStyle('padding', ['6px'])
                .setStyle('cursor', ['pointer'])
                .setStyle('transition', ['all 0.2s ease'])
                .setStyle('aspectRatio', ['1'])
                .setStyle('display', ['flex'])
                .setStyle('flexDirection', ['column'])
                .setStyle('alignItems', ['center'])
                .setStyle('justifyContent', ['center'])
                .setStyle('textAlign', ['center']);
            // Folder icon
            const icon = new UIText('📁')
                .setStyle('fontSize', ['22px'])
                .setStyle('marginBottom', ['3px']);
            // Folder name
            const name = new UIText(folder.name.length > 10 ? folder.name.substring(0, 10) + '...' : folder.name)
                .setStyle('color', ['#fff'])
                .setStyle('fontSize', ['10px'])
                .setStyle('fontWeight', ['bold'])
                .setStyle('marginBottom', ['1px'])
                .setStyle('wordBreak', ['break-all']);
            folderItem.add(icon, name);
            folderItem.onMouseOver(() => {
                folderItem.setStyle('backgroundColor', ['#333'])
                    .setStyle('borderColor', ['#0088ff'])
                    .setStyle('transform', ['translateY(-1px)']);
            });
            folderItem.onMouseOut(() => {
                folderItem.setStyle('backgroundColor', ['#222'])
                    .setStyle('borderColor', ['#444'])
                    .setStyle('transform', ['translateY(0)']);
            });
            folderItem.onClick(() => {
                selectedFolder = folder.path;
                renderAssets();
                renderBreadcrumb();
                updateAssetCount();
            });
            grid.add(folderItem);
        });
        // Render files/assets as before
        const gridHeight = grid.dom.offsetHeight || 300;
        const itemHeight = 70; // estimate
        const itemsPerPage = Math.ceil(gridHeight / itemHeight) * 4; // 4 columns
        const scrollTop = grid.dom.scrollTop || 0;
        const startIdx = Math.floor(scrollTop / itemHeight) * 4;
        const endIdx = Math.min(filteredAssets.length, startIdx + itemsPerPage);
        const visibleAssets = filteredAssets.slice(startIdx, endIdx);
        visibleAssets.forEach((asset, i) => {
            const idx = startIdx + i;
            const item = createAssetItem(asset, idx);
            grid.add(item);
        });
        if (childFolders.length === 0 && filteredAssets.length === 0) {
            const emptyMessage = new UIDiv()
                .setStyle('gridColumn', ['1 / -1'])
                .setStyle('textAlign', ['center'])
                .setStyle('color', ['#666'])
                .setStyle('padding', ['20px'])
                .setStyle('fontSize', ['12px']);
            const message = searchQuery ? 'No assets match your search' :
                selectedFolder && selectedFolder !== 'Assets' ? `No assets in ${selectedFolder}` :
                    'No assets found';
            emptyMessage.add(new UIText(message));
            grid.add(emptyMessage);
        }
        grid.dom.setAttribute('role', 'grid');
        grid.dom.setAttribute('aria-label', 'Asset Grid');
        grid.dom.tabIndex = 0;
        grid.dom.addEventListener('keydown', (e) => {
            const items = Array.from(grid.dom.childNodes);
            const focused = document.activeElement;
            const idx = items.indexOf(focused);
            if (e.key === 'ArrowRight' && idx < items.length - 1) {
                items[idx + 1].focus();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                items[idx - 1].focus();
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                if (idx + 4 < items.length) items[idx + 4].focus();
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                if (idx - 4 >= 0) items[idx - 4].focus();
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (focused && focused.click) focused.click();
                e.preventDefault();
            }
        });
        
    }

    // Update filterAssets to use full path
    function filterAssets() {
        let filtered = currentAssets;
        // Only show files directly in the selected folder (by path)
        filtered = filtered.filter(asset => asset.folder === selectedFolder);
        if (searchQuery) {
            filtered = filtered.filter(asset => 
                asset.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        filteredAssets = filtered;
        updateAssetCount();
        renderAssets();
    }

    // Update folder creation logic to use full path
    function showFolderContextMenu(x, y, pfolderPath) {
        folderContextMenu.clear();
        createSubMenu.clear();
        // Create menu item
        const createItem = new UIButton('Create ▶')
            .setStyle('display', ['block'])
            .setStyle('width', ['160px'])
            .setStyle('background', ['none'])
            .setStyle('border', ['none'])
            .setStyle('color', ['#fff'])
            .setStyle('padding', ['6px 12px'])
            .setStyle('textAlign', ['left'])
            .setStyle('cursor', ['pointer'])
            .setStyle('fontSize', ['12px'])
            .setStyle('position', ['relative']);
        // Show submenu on hover
        createItem.dom.addEventListener('mouseenter', () => {
            createSubMenu.setStyle('display', ['block']);
        });
        createItem.dom.addEventListener('mouseleave', () => {
            setTimeout(() => createSubMenu.setStyle('display', ['none']), 200);
        });
        folderContextMenu.add(createItem);
        // Submenu options
        const createOptions = [
            { label: 'Folder', type: 'folder' },
            { label: 'JS Script', type: 'script' },
            { label: 'Material', type: 'material' }
        ];
        
        createOptions.forEach(opt => {
            const subItem = new UIButton(opt.label)
                .setStyle('display', ['block'])
                .setStyle('width', ['140px'])
                .setStyle('background', ['none'])
                .setStyle('border', ['none'])
                .setStyle('color', ['#fff'])
                .setStyle('padding', ['6px 12px'])
                .setStyle('textAlign', ['left'])
                .setStyle('cursor', ['pointer'])
                .setStyle('fontSize', ['12px']);
            subItem.onMouseOver(() => subItem.setStyle('backgroundColor', ['#444']));
            subItem.onMouseOut(() => subItem.setStyle('backgroundColor', ['transparent']));
            subItem.onClick(() => {
                if (opt.type === 'folder') {
                    const folderName = prompt('Enter new folder name:');
                    if (!folderName || !folderName.trim()) {
                        showNotification('Folder name cannot be empty.', 'error');
                        folderContextMenu.setStyle('display', ['none']);
                        return;
                    }
                    // Find parent folder object by path
                    function findFolderByPath(node, path) {
                        if (node.path === path) return node;
                        if (node.children) {
                            for (const key in node.children) {
                                const found = findFolderByPath(node.children[key], path);
                                if (found) return found;
                            }
                        }
                        return null;
                    }
                    const parentFolderObj = findFolderByPath(folderStructure.root, pfolderPath);
                    const newFolderPath = buildFolderPath(parentFolderObj.path, folderName.trim());
                    if (parentFolderObj.children[folderName.trim()]) {
                        showNotification('Folder already exists.', 'error');
                        folderContextMenu.setStyle('display', ['none']);
                        return;
                    }
                    parentFolderObj.children[folderName.trim()] = {
                        name: folderName.trim(),
                        path: newFolderPath,
                        type: 'folder',
                        children: {}
                    };
                    showNotification('Folder created!', 'info');
                    renderFolderTree();
                    renderAssets();
                }
                folderContextMenu.setStyle('display', ['none']);
            });
            createSubMenu.add(subItem);
        });
        // Position menu
        folderContextMenu.setStyle('display', ['block'])
            .setStyle('left', [x + 'px'])
            .setStyle('top', [y + 'px']);
        createSubMenu.setStyle('display', ['none']);
        createItem.dom.appendChild(createSubMenu.dom);
        createSubMenu.setStyle('position', ['absolute'])
            .setStyle('top', ['0'])
            .setStyle('left', ['100%']);
        folderContextMenu.dom.addEventListener('click', e => {
            e.stopPropagation(); // 🛑 prevent clicks inside the menu from closing it
        });
        // Hide menu when clicking elsewhere
        const hideMenu = () => {
            folderContextMenu.setStyle('display', ['none']);
            document.removeEventListener('click', hideMenu);
        };
        const rect = container.dom.getBoundingClientRect();
        const offsetX = x - rect.left;
        const offsetY = y - rect.top;

        folderContextMenu.setStyle('left', [offsetX + 'px']).setStyle('top', [offsetY + 'px']);
        setTimeout(() => document.addEventListener('click', hideMenu), 0);
    }

    // Assemble layout
    mainContent.add(leftPanel, splitter, rightPanel);
    container.add(header, mainContent, contextMenu, folderContextMenu);

    // Initialize with sample assets
    currentAssets = sampleAssets;
    filteredAssets = [...currentAssets];

    // Render folder tree and right panel on initial load
    renderFolderTree();
    renderAssets();
    
    // Event handlers
    function updateFilterTabs() {
        filterTabs.dom.childNodes.forEach((tab, index) => {
            const filter = filters[index];
            const isActive = filter === currentFilter;
            tab.style.background = isActive ? '#0066cc' : 'transparent';
            tab.style.color = isActive ? '#fff' : '#aaa';
            tab.style.borderBottom = isActive ? '2px solid #0088ff' : '2px solid transparent';
        });
    }

    function updateAssetCount() {
        const folderText = selectedFolder && selectedFolder !== 'root' ? `${selectedFolder} - ` : '';
        assetCount.setValue(`(${folderText}${filteredAssets.length} assets)`);
        renderBreadcrumb();
    }

    function createAssetItem(asset, idx) {
        const item = new UIDiv()
            .setStyle('position', ['relative'])
            .setStyle('background', ['#2a2a2a'])
            .setStyle('border', ['1px solid #444'])
            .setStyle('borderRadius', ['4px'])
            .setStyle('padding', ['6px'])
            .setStyle('cursor', ['pointer'])
            .setStyle('transition', ['all 0.2s ease'])
            .setStyle('aspectRatio', ['1'])
            .setStyle('display', ['flex'])
            .setStyle('flexDirection', ['column'])
            .setStyle('alignItems', ['center'])
            .setStyle('justifyContent', ['center'])
            .setStyle('textAlign', ['center']);

        item.dom.setAttribute('tabindex', '0');
        item.dom.setAttribute('role', 'gridcell');
        item.dom.setAttribute('aria-label', asset.name);

        // Asset icon/preview
        const preview = new UIDiv()
            .setStyle('width', ['32px'])
            .setStyle('height', ['32px'])
            .setStyle('display', ['flex'])
            .setStyle('alignItems', ['center'])
            .setStyle('justifyContent', ['center'])
            .setStyle('fontSize', ['18px'])
            .setStyle('marginBottom', ['3px']);

        if (asset.type === 'textures' && (asset.name.endsWith('.jpg') || asset.name.endsWith('.png'))) {
            const img = new UIImage(asset.path)
                .setStyle('width', ['32px'])
                .setStyle('height', ['32px'])
                .setStyle('objectFit', ['cover'])
                .setStyle('borderRadius', ['2px']);
            preview.add(img);
        } else if (asset.type === 'audio') {
            // Show audio icon and add playback on click
            const icon = new UIText('🔊');
            preview.add(icon);
            let audio;
            item.onClick(() => {
                if (!audio) {
                    audio = document.createElement('audio');
                    audio.src = asset.path;
                    audio.controls = true;
                    audio.style.width = '100%';
                    preview.dom.innerHTML = '';
                    preview.dom.appendChild(audio);
                    audio.play();
                } else {
                    audio.pause();
                    preview.clear();
                    preview.add(icon);
                    audio = null;
                }
            });
        } else if (asset.type === 'videos') {
            // Show video icon and add playback on click
            const icon = new UIText('🎬');
            preview.add(icon);
            let video;
            item.onClick(() => {
                if (!video) {
                    video = document.createElement('video');
                    video.src = asset.path;
                    video.controls = true;
                    video.style.width = '100%';
                    video.style.height = '32px';
                    preview.dom.innerHTML = '';
                    preview.dom.appendChild(video);
                    video.play();
                } else {
                    video.pause();
                    preview.clear();
                    preview.add(icon);
                    video = null;
                }
            });
        } else if (asset.type === 'models') {
            // Show 3D icon for now (optionally, add 3D preview later)
            preview.add(new UIText('🎨'));
        } else if (asset.type === 'materials') {
            preview.add(new UIText('🎭'));
        } else if (asset.type === 'scripts') {
            preview.add(new UIText('📜'));
        } else {
            preview.add(new UIText('📄'));
        }

        // Asset name
        const name = new UIText(asset.name.length > 10 ? asset.name.substring(0, 10) + '...' : asset.name)
            .setStyle('color', ['#fff'])
            .setStyle('fontSize', ['9px'])
            .setStyle('fontWeight', ['bold'])
            .setStyle('marginBottom', ['1px'])
            .setStyle('wordBreak', ['break-all']);

        // Asset size
        const size = new UIText(asset.size)
            .setStyle('color', ['#888'])
            .setStyle('fontSize', ['8px']);

        item.add(preview, name, size);

        // Event handlers
        item.onMouseOver(() => {
            item.setStyle('backgroundColor', ['#333'])
                .setStyle('borderColor', ['#0088ff'])
                .setStyle('transform', ['translateY(-1px)']);
        });

        item.onMouseOut(() => {
            if (selectedAsset !== asset) {
                item.setStyle('backgroundColor', ['#2a2a2a'])
                    .setStyle('borderColor', ['#444'])
                    .setStyle('transform', ['translateY(0)']);
            }
        });

        item.onClick((event) => {
            selectAsset(asset, item);
            if (event.detail === 2) { // Double click
                addAssetToScene(asset);
            }
        });

        item.onContextMenu((event) => {
            event.preventDefault();
            selectedAsset = asset;
            showContextMenu(event.clientX, event.clientY);
        });

        // Drag functionality
        item.dom.draggable = true;
        item.dom.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', JSON.stringify(asset));
            event.dataTransfer.effectAllowed = 'copy';
        });

        // Keyboard context menu
        item.dom.addEventListener('keydown', (e) => {
            if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
                selectedAsset = asset;
                showContextMenu(item.dom.getBoundingClientRect().left, item.dom.getBoundingClientRect().top + 32);
                e.preventDefault();
            }
        });

        return item;
    }

    function selectAsset(asset, itemElement) {
        // Clear previous selection
        grid.dom.childNodes.forEach(child => {
            child.style.backgroundColor = '#2a2a2a';
            child.style.borderColor = '#444';
        });

        // Select current
        selectedAsset = asset;
        itemElement.setStyle('backgroundColor', ['#0066cc'])
            .setStyle('borderColor', ['#0088ff']);
    }

    function showContextMenu(x, y) {
        contextMenu.setStyle('display', ['block'])
            .setStyle('left', [x + 'px'])
            .setStyle('top', [y + 'px']);

        // Hide menu when clicking elsewhere
        const hideMenu = () => {
            contextMenu.setStyle('display', ['none']);
            document.removeEventListener('click', hideMenu);
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 0);
    }

    function handleContextMenuAction(action, asset) {
        switch (action) {
            case 'add':
                addAssetToScene(asset);
                break;
            case 'preview':
                previewAsset(asset);
                break;
            case 'properties':
                showAssetProperties(asset);
                break;
            case 'duplicate':
                duplicateAsset(asset);
                break;
            case 'delete':
                deleteAsset(asset);
                break;
        }
    }

    function addAssetToScene(asset) {
        console.log('Adding asset to scene:', asset.name);
        if (editor && editor.addAsset) {
            editor.addAsset(asset);
        }
        const event = new CustomEvent('assetAdd', { detail: asset });
        document.dispatchEvent(event);
    }

    function previewAsset(asset) {
        console.log('Previewing asset:', asset.name);
        const event = new CustomEvent('assetPreview', { detail: asset });
        document.dispatchEvent(event);
    }

    function showAssetProperties(asset) {
        console.log('Showing properties for:', asset.name);
        const event = new CustomEvent('assetProperties', { detail: asset });
        document.dispatchEvent(event);
    }

    function duplicateAsset(asset) {
        const newAsset = { ...asset, name: asset.name.replace(/(\.[^.]+)$/, '_copy$1') };
        currentAssets.push(newAsset);
        filterAssets();
    }

    function deleteAsset(asset) {
        if (confirm(`Delete ${asset.name}?`)) {
            currentAssets = currentAssets.filter(a => a !== asset);
            filterAssets();
        }
    }

    // Splitter functionality
    let isResizing = false;
    let startX = 0;
    let startWidth = 200;

    splitter.onMouseDown((event) => {
        isResizing = true;
        startX = event.clientX;
        startWidth = leftPanel.dom.offsetWidth;
        document.body.style.cursor = 'col-resize';
        event.preventDefault();
    });
    container.dom.addEventListener('contextmenu', event => {
        event.preventDefault(); // 🚫 stops the default browser menu
    });
    document.addEventListener('mousemove', (event) => {
        if (!isResizing) return;
        
        const deltaX = event.clientX - startX;
        const newWidth = Math.max(150, Math.min(400, startWidth + deltaX));
        leftPanel.setStyle('width', [newWidth + 'px']);
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });

    // Restore expandButton for expanding/minimizing the asset browser
    const expandButton = new UIButton('▲')
        .setStyle('background', ['none'])
        .setStyle('border', ['none'])
        .setStyle('color', ['#fff'])
        .setStyle('cursor', ['pointer'])
        .setStyle('fontSize', ['12px'])
        .setStyle('padding', ['4px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('transition', ['transform 0.3s ease']);

    expandButton.onClick(() => {
        isExpanded = !isExpanded;
        
        
        expandButton.setTextContent(isExpanded ? '▼' : '▲');
        expandButton.setStyle('transform', [isExpanded ? 'rotate(180deg)' : 'rotate(0deg)']);
        // Optional: update viewport bottom if needed
        const topPercent = isExpanded ? 0.7 : 0.9; // 70% top when expanded, 90% when collapsed
        const top = window.innerHeight * topPercent;
        container.setStyle('top', [`${top}px`]);
        const height = window.innerHeight - top;
        const viewport = document.getElementById('viewport');
        const resizer2 = document.getElementById('resizer2');
        const script = document.getElementById('script');
        const player = document.getElementById('player');
        if (viewport) viewport.style.bottom = `${height}px`;
        if (resizer2) resizer2.style.bottom = `${height}px`;
        if (script) script.style.bottom = `${height}px`;
        if (player) player.style.bottom = `${height}px`;
        signals.windowResize.dispatch();
       
    });

    // Search functionality
    searchInput.onInput((event) => {
        searchQuery = event.target.value;
        filterAssets();
    });

    // Refresh functionality
    refreshButton.onClick(() => {
        loadAssets();
    });

    // Drag and drop functionality
    content.onDragOver((event) => {
        event.preventDefault();
        dropZone.setStyle('display', ['flex']);
    });

    content.onDragLeave((event) => {
        if (!content.dom.contains(event.relatedTarget)) {
            dropZone.setStyle('display', ['none']);
        }
    });

    content.onDrop((event) => {
        event.preventDefault();
        dropZone.setStyle('display', ['none']);
        handleFileUpload({ target: { files: event.dataTransfer.files } });
    });
    
    function handleFileUpload(event) {
        const files = Array.from(event.target.files);
        const targetFolder = selectedFolder && selectedFolder !== 'root' ? selectedFolder : 'root';
        let added = 0;
        files.forEach(file => {
            const assetType = getAssetType(file.name);
            if (!assetTypes[assetType]) {
                showNotification(`Unsupported file type: ${file.name}`, 'error');
                return;
            }
            if (file.size > 100 * 1024 * 1024) { // 100MB limit
                showNotification(`File too large: ${file.name}`, 'error');
                return;
            }
            const folder = targetFolder === 'root' ? getDefaultFolder(assetType) : targetFolder;
            if (currentAssets.some(a => a.name === file.name && a.folder === folder)) {
                showNotification(`Duplicate asset name in folder: ${file.name}`, 'error');
                return;
            }
            const asset = {
                name: file.name,
                type: assetType,
                size: formatFileSize(file.size),
                path: URL.createObjectURL(file),
                folder: folder,
                file: file
            };
            currentAssets.push(asset);
            added++;
        });
        if (added > 0) {
            showNotification(`${added} asset(s) uploaded successfully!`, 'info');
        }
        filterAssets();
    }
    
    function getDefaultFolder(assetType) {
        const folderMap = {
            'models': 'Models',
            'textures': 'Textures',
            'materials': 'Materials',
            'audio': 'Audio',
            'scripts': 'Scripts'
        };
        return folderMap[assetType] || 'root';
    }

    function getAssetType(filename) {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        for (const [type, config] of Object.entries(assetTypes)) {
            if (config.extensions.includes(ext)) {
                return type;
            }
        }
        return 'scripts';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function loadAssets() {
        console.log('Refreshing assets...');
        refreshButton.setValue('⟳');
        setTimeout(() => {
            refreshButton.setValue('🔄');
            filterAssets();
        }, 500);
    }

    function showNotification(message, type = 'info', duration = 2500) {
        notification.setStyle('background', [type === 'error' ? '#c0392b' : '#222']);
        notification.setTextContent(message);
        notification.setStyle('display', ['block']);
        setTimeout(() => notification.setStyle('display', ['none']), duration);
    }

    // --- Breadcrumb Path UI ---
    function getBreadcrumbPath(folderName) {
        // Traverse up from selectedFolder to root
        const path = [];
        let current = folderName;
        let parent = folderStructure.root;
        if (current === 'root' || !current) return [{ name: 'Assets', key: 'root' }];
        // Find path recursively
        function findPath(node, key, acc) {
            if (key === current) {
                acc.push({ name: node.name, key });
                return true;
            }
            if (node.children) {
                for (const childKey in node.children) {
                    if (findPath(node.children[childKey], childKey, acc)) {
                        acc.unshift({ name: node.name, key });
                        return true;
                    }
                }
            }
            return false;
        }
        findPath(folderStructure.root, 'root', path);
        return path;
    }

    function renderBreadcrumb() {
        breadcrumb.clear();
        const path = getBreadcrumbPath(selectedFolder || 'root');
        path.forEach((segment, idx) => {
            const crumb = new UIText(segment.name)
                .setStyle('color', ['#fff'])
                .setStyle('fontWeight', ['bold'])
                .setStyle('cursor', ['pointer'])
                .setStyle('fontSize', ['14px'])
                .setStyle('paddingRight', ['4px']);
            crumb.dom.addEventListener('click', () => {
                selectFolder(segment.key);
                renderBreadcrumb();
            });
            breadcrumb.add(crumb);
            if (idx < path.length - 1) {
                const divider = new UIText('>')
                    .setStyle('color', ['#888'])
                    .setStyle('fontSize', ['13px'])
                    .setStyle('padding', ['0 4px']);
                breadcrumb.add(divider);
            }
        });
    }

    // --- Header Layout Update ---
    // Remove old titleSection and assetCount usage
    // Add new breadcrumb, filter badge, and asset count
    const breadcrumb = new UIDiv().setStyle('display', ['inline-flex']).setStyle('alignItems', ['center']);
    const filterBadge = new UIDiv().setStyle('display', ['inline-flex']).setStyle('alignItems', ['center']);
    const assetCount = new UIText('(0 assets)')
        .setStyle('color', ['#888'])
        .setStyle('fontSize', ['12px'])
        .setStyle('marginLeft', ['8px']);
    const headerLeft = new UIDiv()
        .setStyle('display', ['flex'])
        .setStyle('alignItems', ['center'])
        .setStyle('gap', ['8px']);
    headerLeft.add(expandButton, breadcrumb, filterBadge, assetCount);
    header.clear();
    header.add(headerLeft, controls);

    // Initial render
    renderBreadcrumb();

    // Attach a single contextmenu handler to the whole asset browser container
    container.dom.addEventListener('contextmenu', function(event) {
        event.preventDefault(); // Always suppress native menu
        
        let el = event.target;
        // Check if right-clicked on a folder in the tree
        while (el && el !== container.dom) {
            if (el.getAttribute && el.getAttribute('role') === 'treeitem') {
                const folderName = el.textContent.trim();
                showFolderContextMenu(event.clientX, event.clientY, folderName);
                return;
            }
            el = el.parentElement;
        }
        // If right-clicked on the right panel (not on an asset)
        // Show a context menu for creating assets in the current folder
        // (Assume rightPanel.dom is the asset grid area)
        if (event.target === rightPanel.dom || rightPanel.dom.contains(event.target)) {
            showFolderContextMenu(event.clientX, event.clientY, selectedFolder || 'root');
            return;
        }
        // Optionally, handle other areas if needed
    });

	return container;
}

export { AssetBrowser };