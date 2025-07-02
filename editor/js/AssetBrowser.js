// AssetBrowser.js
import { UISpan, UIDiv, UIImage, UIText, UIInput, UIButton } from './libs/ui.js';

function AssetBrowser(editor) {
    const container = new UISpan().setId('asset-browser');
    
    // State management
    let currentAssets = [];
    let filteredAssets = [];
    let selectedAsset = null;
    let currentFilter = 'all';
    let searchQuery = '';
    let isExpanded = false;
    let currentHeight = 250;
    let currentFolder = 'root';
    let folderStructure = {};
    let selectedFolder = null;
    
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
       // .setStyle('height', ['250px']) // Start with a reasonable default height
       // .setStyle('minHeight', ['150px'])
       // .setStyle('maxHeight', ['500px'])
        .setStyle('background', ['#1a1a1a'])
        .setStyle('borderTop', ['1px solid #444'])
        .setStyle('borderRight', ['1px solid #444'])
        .setStyle('overflow', ['hidden'])
        .setStyle('zIndex', ['10'])
        .setStyle('transition', ['height 0.3s ease'])
        .setStyle('display', ['flex'])
        .setStyle('flexDirection', ['column']);

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

    const titleSection = new UIDiv()
        .setStyle('display', ['flex'])
        .setStyle('alignItems', ['center'])
        .setStyle('gap', ['8px']);

    const expandButton = new UIButton('▲')
        .setStyle('background', ['none'])
        .setStyle('border', ['none'])
        .setStyle('color', ['#fff'])
        .setStyle('cursor', ['pointer'])
        .setStyle('fontSize', ['12px'])
        .setStyle('padding', ['4px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('transition', ['transform 0.3s ease']);

    const title = new UIText('Project')
        .setStyle('color', ['#fff'])
        .setStyle('fontSize', ['14px'])
        .setStyle('fontWeight', ['bold']);

    const assetCount = new UIText('(0 assets)')
        .setStyle('color', ['#888'])
        .setStyle('fontSize', ['12px']);

    titleSection.add(expandButton, title, assetCount);

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

    const createFolderButton = new UIButton('📁+')
        .setStyle('background', ['#444'])
        .setStyle('border', ['1px solid #666'])
        .setStyle('color', ['#fff'])
        .setStyle('cursor', ['pointer'])
        .setStyle('padding', ['4px 8px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('fontSize', ['12px']);

    const refreshButton = new UIButton('🔄')
        .setStyle('background', ['#444'])
        .setStyle('border', ['1px solid #666'])
        .setStyle('color', ['#fff'])
        .setStyle('cursor', ['pointer'])
        .setStyle('padding', ['4px 8px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('fontSize', ['12px']);

    const uploadButton = new UIButton('📂')
        .setStyle('background', ['#444'])
        .setStyle('border', ['1px solid #666'])
        .setStyle('color', ['#fff'])
        .setStyle('cursor', ['pointer'])
        .setStyle('padding', ['4px 8px'])
        .setStyle('borderRadius', ['3px'])
        .setStyle('fontSize', ['12px']);

    controls.add(searchInput, createFolderButton, refreshButton, uploadButton);
    header.add(titleSection, controls);

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

    // Filter tabs (moved to right panel)
    const filterTabs = new UIDiv()
        .setStyle('display', ['flex'])
        .setStyle('backgroundColor', ['#2a2a2a'])
        .setStyle('borderBottom', ['1px solid #333'])
        .setStyle('overflowX', ['auto'])
        .setStyle('minHeight', ['35px'])
        .setStyle('flexShrink', ['0']);

    const filters = ['all', 'models', 'textures', 'materials', 'audio', 'videos', 'scripts'];
    
    filters.forEach(filter => {
        const tab = new UIButton(filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1))
            .setStyle('background', [filter === currentFilter ? '#0066cc' : 'transparent'])
            .setStyle('border', ['none'])
            .setStyle('color', [filter === currentFilter ? '#fff' : '#aaa'])
            .setStyle('padding', ['6px 12px'])
            .setStyle('cursor', ['pointer'])
            .setStyle('fontSize', ['11px'])
            .setStyle('whiteSpace', ['nowrap'])
            .setStyle('borderBottom', [filter === currentFilter ? '2px solid #0088ff' : '2px solid transparent'])
            .setStyle('transition', ['all 0.2s ease']);

        tab.onClick(() => {
            currentFilter = filter;
            updateFilterTabs();
            filterAssets();
        });

        filterTabs.add(tab);
    });

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
    rightPanel.add(filterTabs, content);

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

    // Assemble layout
    mainContent.add(leftPanel, splitter, rightPanel);
    container.add(header, mainContent, contextMenu);

    // Initialize folder structure
    folderStructure = {
        root: {
            name: 'Assets',
            type: 'folder',
            children: {
                Models: { name: 'Models', type: 'folder', children: {} },
                Textures: { name: 'Textures', type: 'folder', children: {} },
                Materials: { name: 'Materials', type: 'folder', children: {} },
                Audio: { name: 'Audio', type: 'folder', children: {} },
                Scripts: { name: 'Scripts', type: 'folder', children: {} }
            }
        }
    };

    // Initialize with sample assets
    const sampleAssets = [
        { name: 'wood_texture.jpg', type: 'textures', size: '2.1 MB', path: 'assets/wood_texture.jpg', folder: 'Textures' },
        { name: 'metal_material.mtl', type: 'materials', size: '0.5 KB', path: 'assets/metal_material.mtl', folder: 'Materials' },
        { name: 'chair_model.glb', type: 'models', size: '15.2 MB', path: 'assets/chair_model.glb', folder: 'Models' },
        { name: 'ambient_sound.mp3', type: 'audio', size: '3.8 MB', path: 'assets/ambient_sound.mp3', folder: 'Audio' },
        { name: 'script_helper.js', type: 'scripts', size: '1.2 KB', path: 'assets/script_helper.js', folder: 'Scripts' }
    ];

    currentAssets = sampleAssets;
    filteredAssets = [...currentAssets];

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

    function filterAssets() {
        let filtered = currentAssets;

        // Apply folder filter
        if (selectedFolder && selectedFolder !== 'root') {
            filtered = filtered.filter(asset => asset.folder === selectedFolder);
        }

        // Apply type filter
        if (currentFilter !== 'all') {
            filtered = filtered.filter(asset => asset.type === currentFilter);
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(asset => 
                asset.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        filteredAssets = filtered;
        updateAssetCount();
        renderAssets();
    }

    function updateAssetCount() {
        const folderText = selectedFolder && selectedFolder !== 'root' ? `${selectedFolder} - ` : '';
        assetCount.setValue(`(${folderText}${filteredAssets.length} assets)`);
    }

    function renderFolderTree() {
        folderTree.clear();

        function createFolderItem(folder, name, level = 0) {
            const item = new UIDiv()
                .setStyle('display', ['flex'])
                .setStyle('alignItems', ['center'])
                .setStyle('padding', [`4px ${8 + level * 16}px`])
                .setStyle('cursor', ['pointer'])
                .setStyle('fontSize', ['12px'])
                .setStyle('color', [selectedFolder === name ? '#0088ff' : '#ccc'])
                .setStyle('borderLeft', [selectedFolder === name ? '3px solid #0088ff' : '3px solid transparent'])
                .setStyle('backgroundColor', [selectedFolder === name ? '#333' : 'transparent']);

            const icon = new UIText(level === 0 ? '📁' : '📂')
                .setStyle('marginRight', ['6px'])
                .setStyle('fontSize', ['11px']);

            const label = new UIText(folder.name)
                .setStyle('fontSize', ['11px']);

            item.add(icon, label);

            item.onMouseOver(() => {
                if (selectedFolder !== name) {
                    item.setStyle('backgroundColor', ['#2a2a2a']);
                }
            });

            item.onMouseOut(() => {
                if (selectedFolder !== name) {
                    item.setStyle('backgroundColor', ['transparent']);
                }
            });

            item.onClick(() => {
                selectFolder(name, item);
            });

            folderTree.add(item);

            // Add child folders
            if (folder.children) {
                Object.keys(folder.children).forEach(childName => {
                    createFolderItem(folder.children[childName], childName, level + 1);
                });
            }
        }

        createFolderItem(folderStructure.root, 'root');
    }

    function selectFolder(folderName, itemElement) {
        // Clear previous selection
        folderTree.dom.childNodes.forEach(child => {
            child.style.color = '#ccc';
            child.style.borderLeft = '3px solid transparent';
            child.style.backgroundColor = 'transparent';
        });

        // Select current
        selectedFolder = folderName;
        if (itemElement) {
            itemElement.setStyle('color', ['#0088ff'])
                .setStyle('borderLeft', ['3px solid #0088ff'])
                .setStyle('backgroundColor', ['#333']);
        }

        filterAssets();
    }

    function renderAssets() {
        grid.clear();

        filteredAssets.forEach(asset => {
            const item = createAssetItem(asset);
            grid.add(item);
        });

        if (filteredAssets.length === 0) {
            const emptyMessage = new UIDiv()
                .setStyle('gridColumn', ['1 / -1'])
                .setStyle('textAlign', ['center'])
                .setStyle('color', ['#666'])
                .setStyle('padding', ['20px'])
                .setStyle('fontSize', ['12px']);
            
            const message = searchQuery ? 'No assets match your search' : 
                           selectedFolder && selectedFolder !== 'root' ? `No assets in ${selectedFolder}` : 
                           'No assets found';
            emptyMessage.add(new UIText(message));
            grid.add(emptyMessage);
        }
    }

    function createAssetItem(asset) {
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
        } else {
            const icon = assetTypes[asset.type]?.icon || '📄';
            preview.add(new UIText(icon));
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

    function createFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim()) {
            const parentFolder = selectedFolder || 'root';
            const parent = parentFolder === 'root' ? folderStructure.root : 
                          folderStructure.root.children[parentFolder];
            
            if (parent && parent.children) {
                parent.children[folderName.trim()] = {
                    name: folderName.trim(),
                    type: 'folder',
                    children: {}
                };
                renderFolderTree();
            }
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

    // Expand/Collapse functionality
    expandButton.onClick(() => {
        isExpanded = !isExpanded;
        const topPercent = isExpanded ? 0.7 : 0.9; // 40% top when expanded, 90% when collapsed
        const top = window.innerHeight * topPercent;

        container.setStyle('top', [`${top}px`]);
        expandButton.setTextContent(isExpanded ? '▼' : '▲');
        expandButton.setStyle('transform', [isExpanded ? 'rotate(180deg)' : 'rotate(0deg)']);

        // Optional: update viewport bottom if needed
        const height = window.innerHeight - top;
        document.getElementById('resizer2').style.bottom = `${height}px`;
        document.getElementById('viewport').style.bottom = `${height}px`;
        
    });

    // Search functionality
    searchInput.onInput((event) => {
        searchQuery = event.target.value;
        filterAssets();
    });

    // Create folder functionality
    createFolderButton.onClick(() => {
        createFolder();
    });

    // Refresh functionality
    refreshButton.onClick(() => {
        loadAssets();
    });

    // Upload functionality
    uploadButton.onClick(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.gltf,.glb,.fbx,.obj,.jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4,.js,.json,.mtl';
        input.onchange = handleFileUpload;
        input.click();
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
        
        files.forEach(file => {
            const asset = {
                name: file.name,
                type: getAssetType(file.name),
                size: formatFileSize(file.size),
                path: URL.createObjectURL(file),
                folder: targetFolder === 'root' ? getDefaultFolder(getAssetType(file.name)) : targetFolder,
                file: file
            };
            currentAssets.push(asset);
        });
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
	return container;
}

export { AssetBrowser };