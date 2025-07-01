// AssetBrowser.js - Add this as a new file in your Three.js editor

class AssetBrowser {
    constructor(editor) {
        this.editor = editor;
        this.assets = new Map();
        this.selectedAssets = new Set();
        this.currentFolder = 'Assets';
        this.folders = new Map();
        
        this.init();
        this.setupEventListeners();
        this.loadDefaultFolders();
    }

    init() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'asset-browser';
        
        // Create header with tabs
        this.createHeader();
        
        // Create resize handle
        this.createResizeHandle();
        
        // Create main content area
        this.createContent();
        
        // Add to DOM
        document.body.appendChild(this.container);

        // Create file context menu
        this.createFileContextMenu();

        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'asset-notification-container';
        document.body.appendChild(this.notificationContainer);

        // Create modal dialog
        this.createModalDialog();
    }

    createHeader() {
        this.header = document.createElement('div');
        this.header.className = 'asset-browser-header';
        
        this.tabContainer = document.createElement('div');
        this.tabContainer.className = 'asset-browser-tabs';
        
        // Project tab (like Unity)
        this.projectTab = document.createElement('button');
        this.projectTab.className = 'asset-browser-tab selected';
        this.projectTab.textContent = 'Project';
        this.projectTab.onclick = () => this.selectTab('project');
        
        this.tabContainer.appendChild(this.projectTab);
        this.header.appendChild(this.tabContainer);
        this.container.appendChild(this.header);
    }

    createResizeHandle() {
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'asset-browser-resize-handle';
        
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;
        
        this.resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = this.container.offsetHeight;
            document.addEventListener('mousemove', this.handleResize);
            document.addEventListener('mouseup', this.stopResize);
            e.preventDefault();
        });
        
        this.handleResize = (e) => {
            if (!isResizing) return;
            const deltaY = startY - e.clientY;
            const newHeight = Math.max(150, Math.min(600, startHeight + deltaY));
            this.container.style.height = newHeight + 'px';
            this.updateViewportBottom(newHeight);
        };
        
        this.stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', this.handleResize);
            document.removeEventListener('mouseup', this.stopResize);
        };
        
        this.container.appendChild(this.resizeHandle);
    }

    createContent() {
        this.content = document.createElement('div');
        this.content.className = 'asset-browser-content';
        
        // Create folder panel
        this.createFolderPanel();
        
        // Create vertical splitter
        this.createVerticalSplitter();
        
        // Create asset grid panel
        this.createAssetGridPanel();
        
        this.container.appendChild(this.content);
    }

    createFolderPanel() {
        this.folderPanel = document.createElement('div');
        this.folderPanel.className = 'asset-folder-panel';
        
        // Remove the New Folder button and header, just add the folder tree
        this.folderTree = document.createElement('div');
        this.folderTree.className = 'asset-folder-tree';
        
        this.folderPanel.appendChild(this.folderTree);
        this.content.appendChild(this.folderPanel);

        // Create context menu for folders
        this.createFolderContextMenu();
    }

    createVerticalSplitter() {
        this.verticalSplitter = document.createElement('div');
        this.verticalSplitter.className = 'asset-vertical-splitter';
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        this.verticalSplitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = this.folderPanel.offsetWidth;
            document.addEventListener('mousemove', this.handleVerticalResize);
            document.addEventListener('mouseup', this.stopVerticalResize);
            e.preventDefault();
        });
        
        this.handleVerticalResize = (e) => {
            if (!isResizing) return;
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(100, Math.min(400, startWidth + deltaX));
            this.folderPanel.style.width = newWidth + 'px';
        };
        
        this.stopVerticalResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', this.handleVerticalResize);
            document.removeEventListener('mouseup', this.stopVerticalResize);
        };
        
        this.content.appendChild(this.verticalSplitter);
    }

    createAssetGridPanel() {
        this.gridPanel = document.createElement('div');
        this.gridPanel.className = 'asset-grid-panel';
        
        // Create toolbar
        this.createGridToolbar();
        
        // Create breadcrumb navigation
        this.breadcrumb = document.createElement('div');
        this.breadcrumb.className = 'asset-breadcrumb';
        this.gridPanel.appendChild(this.breadcrumb);
        
        // Create grid container
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'asset-grid-container';
        
        this.assetGrid = document.createElement('div');
        this.assetGrid.className = 'asset-grid';
        
        this.gridContainer.appendChild(this.assetGrid);
        this.gridPanel.appendChild(this.gridContainer);
        this.content.appendChild(this.gridPanel);

        // Right-click on empty area of asset grid to open folder context menu for current folder
        this.gridContainer.addEventListener('contextmenu', (e) => {
            // Only show if not right-clicking on an asset item
            if (!e.target.classList.contains('asset-item') && !e.target.closest('.asset-item')) {
                e.preventDefault();
                e.stopPropagation();
                this.showFolderContextMenu(e.clientX, e.clientY, this.currentFolder);
            }
        });
    }

    createGridToolbar() {
        this.gridToolbar = document.createElement('div');
        this.gridToolbar.className = 'asset-grid-toolbar';
        
        // Search input
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search...';
        this.searchInput.className = 'asset-search-input';
        this.searchInput.addEventListener('input', (e) => this.filterAssets(e.target.value));
        
        // View controls
        this.viewControls = document.createElement('div');
        this.viewControls.className = 'asset-view-controls';
        
        this.gridToolbar.appendChild(this.searchInput);
        this.gridToolbar.appendChild(this.viewControls);
        this.gridPanel.appendChild(this.gridToolbar);
    }

    loadDefaultFolders() {
        const defaultFolders = [
            { name: 'Assets', path: 'Assets', children: [
                { name: 'Models', path: 'Assets/Models', children: [] },
                { name: 'Textures', path: 'Assets/Textures', children: [] },
                { name: 'Materials', path: 'Assets/Materials', children: [] },
                { name: 'Scripts', path: 'Assets/Scripts', children: [] },
                { name: 'Audio', path: 'Assets/Audio', children: [] }
            ]}
        ];
        
        this.folders.set('Assets', defaultFolders[0]);
        this.renderFolderTree();
        this.selectFolder('Assets');
        this.renderBreadcrumb();
    }

    renderFolderTree() {
        this.folderTree.innerHTML = '';
        this.renderFolderNode(this.folders.get('Assets'), 0);
    }

    renderFolderNode(folder, depth) {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.style.paddingLeft = (depth * 15 + 5) + 'px';
        folderItem.dataset.path = folder.path;
        
        // Toggle button
        const toggle = document.createElement('div');
        toggle.className = folder.children.length > 0 ? 'folder-toggle expanded' : 'folder-toggle empty';
        
        // Folder icon
        const icon = document.createElement('div');
        icon.className = 'folder-icon';
        
        // Folder name
        const name = document.createElement('span');
        name.textContent = folder.name;
        
        folderItem.appendChild(toggle);
        folderItem.appendChild(icon);
        folderItem.appendChild(name);
        
        // Event listeners
        folderItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectFolder(folder.path);
        });
        
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (toggle.classList.contains('expanded')) {
                toggle.classList.replace('expanded', 'collapsed');
                this.collapseFolderChildren(folder.path);
            } else if (toggle.classList.contains('collapsed')) {
                toggle.classList.replace('collapsed', 'expanded');
                this.expandFolderChildren(folder.path);
            }
        });

        // Context menu (right-click)
        folderItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showFolderContextMenu(e.clientX, e.clientY, folder.path);
        });

        // Drag-and-drop support for moving assets into folders
        folderItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            folderItem.style.background = 'rgba(8,143,255,0.08)';
        });
        folderItem.addEventListener('dragleave', (e) => {
            folderItem.style.background = '';
        });
        folderItem.addEventListener('drop', (e) => {
            e.preventDefault();
            folderItem.style.background = '';
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.type === 'asset' && data.assetId) {
                    const asset = this.assets.get(data.assetId);
                    if (asset && asset.folder !== folder.path) {
                        asset.folder = folder.path;
                        this.refreshAssetGrid();
                    }
                }
            } catch (err) {}
        });
        
        this.folderTree.appendChild(folderItem);
        
        // Render children if expanded
        if (toggle.classList.contains('expanded')) {
            folder.children.forEach(child => {
                this.renderFolderNode(child, depth + 1);
            });
        }
    }

    selectFolder(path) {
        if (this.currentFolder === path) return;
        
        // Update UI
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.path === path) {
                item.classList.add('selected');
            }
        });
        
        this.currentFolder = path;
        this.refreshAssetGrid();
        this.renderBreadcrumb();
    }

    refreshAssetGrid() {
        this.assetGrid.innerHTML = '';
        
        // Get assets for current folder
        const folderAssets = this.getAssetsForFolder(this.currentFolder);
        
        folderAssets.forEach(asset => {
            this.createAssetItem(asset);
        });
    }

    createAssetItem(asset) {
        const assetItem = document.createElement('div');
        assetItem.className = 'asset-item';
        assetItem.dataset.assetId = asset.id;
        assetItem.draggable = true;
        
        // Thumbnail
        const thumbnail = document.createElement('div');
        thumbnail.className = 'asset-thumbnail';
        
        if (asset.thumbnail) {
            const img = document.createElement('img');
            img.src = asset.thumbnail;
            thumbnail.appendChild(img);
        } else {
            const icon = document.createElement('div');
            icon.className = `asset-thumbnail-icon ${asset.type}`;
            thumbnail.appendChild(icon);
        }
        
        // Name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'asset-name';
        nameDiv.textContent = asset.name;
        
        assetItem.appendChild(thumbnail);
        assetItem.appendChild(nameDiv);
        
        // Event listeners
        assetItem.addEventListener('click', (e) => this.selectAsset(asset.id, e));
        assetItem.addEventListener('dblclick', (e) => this.openAsset(asset.id));
        assetItem.addEventListener('dragstart', (e) => this.onDragStart(e, asset));
        // Right-click context menu for files
        assetItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showFileContextMenu(e.clientX, e.clientY, asset.id);
        });
        
        this.assetGrid.appendChild(assetItem);
    }

    selectAsset(assetId, event) {
        if (!event.ctrlKey && !event.metaKey) {
            this.selectedAssets.clear();
        }
        
        if (this.selectedAssets.has(assetId)) {
            this.selectedAssets.delete(assetId);
        } else {
            this.selectedAssets.add(assetId);
        }
        
        this.updateAssetSelection();
    }

    updateAssetSelection() {
        document.querySelectorAll('.asset-item').forEach(item => {
            const assetId = item.dataset.assetId;
            if (this.selectedAssets.has(assetId)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    openAsset(assetId) {
        const asset = this.assets.get(assetId);
        if (!asset) return;
        
        // Handle different asset types
        switch (asset.type) {
            case 'model':
                this.loadModel(asset);
                break;
            case 'texture':
                this.loadTexture(asset);
                break;
            case 'material':
                this.loadMaterial(asset);
                break;
            case 'script':
                this.openScript(asset);
                break;
        }
    }

    loadModel(asset) {
        // Integrate with Three.js editor's model loading
        if (this.editor && this.editor.loader) {
            this.editor.loader.loadFile(asset.file);
        }
    }

    onDragStart(event, asset) {
        event.dataTransfer.setData('application/json', JSON.stringify({
            type: 'asset',
            assetId: asset.id,
            assetType: asset.type
        }));
        
        event.target.classList.add('dragging');
        
        // Remove dragging class when drag ends
        setTimeout(() => {
            event.target.classList.remove('dragging');
        }, 100);
    }

    // Utility methods
    getAssetsForFolder(folderPath) {
        const assets = [];
        this.assets.forEach(asset => {
            if (asset.folder === folderPath) {
                assets.push(asset);
            }
        });
        return assets;
    }

    addAsset(file, type, folder = 'Assets') {
        const asset = {
            id: this.generateAssetId(),
            name: file.name,
            type: type,
            file: file,
            folder: folder,
            thumbnail: null,
            metadata: {}
        };
        
        this.assets.set(asset.id, asset);
        this.generateThumbnail(asset);
        
        if (this.currentFolder === folder) {
            this.refreshAssetGrid();
        }
        
        return asset;
    }

    generateAssetId() {
        return 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateThumbnail(asset) {
        // Generate thumbnails based on asset type
        // This is a simplified version - you'd expand this based on your needs
    }

    updateViewportBottom(assetBrowserHeight) {
        const viewport = document.getElementById('viewport');
        const script = document.getElementById('script');
        const player = document.getElementById('player');
        const sidebar = document.getElementById('sidebar');
        
        if (viewport) viewport.style.bottom = assetBrowserHeight + 'px';
        if (script) script.style.bottom = assetBrowserHeight + 'px';
        if (player) player.style.bottom = assetBrowserHeight + 'px';
        if (sidebar) sidebar.style.bottom = assetBrowserHeight + 'px';
    }

    selectTab(tabName) {
        // Handle tab switching if you add more tabs
        document.querySelectorAll('.asset-browser-tab').forEach(tab => {
            tab.classList.remove('selected');
        });
        
        if (tabName === 'project') {
            this.projectTab.classList.add('selected');
        }
    }

    filterAssets(searchTerm) {
        const items = document.querySelectorAll('.asset-item');
        items.forEach(item => {
            const assetId = item.dataset.assetId;
            const asset = this.assets.get(assetId);
            if (asset && asset.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    setupEventListeners() {
        // Handle file drops on the asset browser
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => {
                const type = this.detectAssetType(file);
                this.addAsset(file, type, this.currentFolder);
            });
        });
    }

    detectAssetType(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        const typeMap = {
            // Models
            'gltf': 'model', 'glb': 'model', 'fbx': 'model', 'obj': 'model',
            'dae': 'model', '3ds': 'model', 'ply': 'model',
            
            // Textures
            'jpg': 'texture', 'jpeg': 'texture', 'png': 'texture', 'gif': 'texture',
            'bmp': 'texture', 'tga': 'texture', 'webp': 'texture', 'svg': 'texture',
            'hdr': 'texture', 'exr': 'texture',
            
            // Audio
            'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'aac': 'audio',
            
            // Scripts
            'js': 'script', 'json': 'script', 'glsl': 'script',
            
            // Materials
            'mtl': 'material'
        };
        
        return typeMap[extension] || 'unknown';
    }

    renderBreadcrumb() {
        this.breadcrumb.innerHTML = '';
        const parts = this.currentFolder.split('/');
        let path = '';
        parts.forEach((part, i) => {
            if (i > 0) {
                const sep = document.createElement('span');
                sep.textContent = ' > ';
                this.breadcrumb.appendChild(sep);
            }
            path += (i === 0 ? '' : '/') + part;
            const crumb = document.createElement('span');
            crumb.textContent = part;
            crumb.className = 'breadcrumb-segment';
            if (i === parts.length - 1) {
                crumb.style.fontWeight = 'bold';
            } else {
                crumb.style.cursor = 'pointer';
                crumb.onclick = () => this.selectFolder(path);
            }
            this.breadcrumb.appendChild(crumb);
        });
    }

    createNewFolder(parentPath) {
        const parentFolder = this.findFolderByPath(parentPath);
        if (!parentFolder) return;
        let folderName = prompt('Enter new folder name:');
        if (!folderName) return;
        folderName = folderName.trim();
        if (!folderName) return;
        // Ensure unique name
        let uniqueName = folderName;
        let i = 1;
        while (parentFolder.children.some(f => f.name === uniqueName)) {
            uniqueName = folderName + ' (' + i + ')';
            i++;
        }
        const newPath = parentPath + '/' + uniqueName;
        const newFolder = { name: uniqueName, path: newPath, children: [] };
        parentFolder.children.push(newFolder);
        this.renderFolderTree();
        this.selectFolder(newPath);
    }

    findFolderByPath(path) {
        function find(folder) {
            if (folder.path === path) return folder;
            for (const child of folder.children) {
                const found = find(child);
                if (found) return found;
            }
            return null;
        }
        return find(this.folders.get('Assets'));
    }

    createFolderContextMenu() {
        this.folderContextMenu = document.createElement('div');
        this.folderContextMenu.className = 'asset-folder-context-menu';
        this.folderContextMenu.style.position = 'fixed';
        this.folderContextMenu.style.display = 'none';
        this.folderContextMenu.style.zIndex = 10000;
        this.folderContextMenu.style.background = '#fff';
        this.folderContextMenu.style.border = '1px solid #ccc';
        this.folderContextMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        this.folderContextMenu.style.padding = '4px 0';
        this.folderContextMenu.style.minWidth = '140px';
        this.folderContextMenu.style.fontSize = '13px';

        // New Folder option
        const newFolderOption = document.createElement('div');
        newFolderOption.textContent = 'New Folder';
        newFolderOption.style.padding = '6px 16px';
        newFolderOption.style.cursor = 'pointer';
        newFolderOption.onmouseenter = () => newFolderOption.style.background = '#eee';
        newFolderOption.onmouseleave = () => newFolderOption.style.background = 'none';
        newFolderOption.onclick = () => {
            if (this.folderContextMenu._targetPath) {
                this.createNewFolder(this.folderContextMenu._targetPath);
            }
            this.hideFolderContextMenu();
        };
        this.folderContextMenu.appendChild(newFolderOption);

        // New File option (with submenu)
        const newFileOption = document.createElement('div');
        newFileOption.textContent = 'New File ▶';
        newFileOption.style.padding = '6px 16px';
        newFileOption.style.cursor = 'pointer';
        newFileOption.onmouseenter = () => {
            newFileOption.style.background = '#eee';
            newFileSubmenu.style.display = 'block';
        };
        newFileOption.onmouseleave = () => {
            newFileOption.style.background = 'none';
            setTimeout(() => { newFileSubmenu.style.display = 'none'; }, 200);
        };
        this.folderContextMenu.appendChild(newFileOption);

        // New File submenu
        const newFileSubmenu = document.createElement('div');
        newFileSubmenu.style.position = 'absolute';
        newFileSubmenu.style.left = '140px';
        newFileSubmenu.style.top = newFileOption.offsetTop + 'px';
        newFileSubmenu.style.display = 'none';
        newFileSubmenu.style.background = '#fff';
        newFileSubmenu.style.border = '1px solid #ccc';
        newFileSubmenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        newFileSubmenu.style.padding = '4px 0';
        newFileSubmenu.style.minWidth = '100px';
        newFileSubmenu.style.fontSize = '13px';
        newFileSubmenu.style.zIndex = 10001;
        ['JS', 'JSON', 'GLSL'].forEach(type => {
            const item = document.createElement('div');
            item.textContent = type + ' File';
            item.style.padding = '6px 16px';
            item.style.cursor = 'pointer';
            item.onmouseenter = () => item.style.background = '#eee';
            item.onmouseleave = () => item.style.background = 'none';
            item.onclick = () => {
                if (this.folderContextMenu._targetPath) {
                    this.createNewFile(this.folderContextMenu._targetPath, type.toLowerCase());
                }
                this.hideFolderContextMenu();
            };
            newFileSubmenu.appendChild(item);
        });
        newFileOption.appendChild(newFileSubmenu);

        // Rename Folder option
        const renameFolderOption = document.createElement('div');
        renameFolderOption.textContent = 'Rename';
        renameFolderOption.style.padding = '6px 16px';
        renameFolderOption.style.cursor = 'pointer';
        renameFolderOption.onmouseenter = () => renameFolderOption.style.background = '#eee';
        renameFolderOption.onmouseleave = () => renameFolderOption.style.background = 'none';
        renameFolderOption.onclick = () => {
            if (this.folderContextMenu._targetPath) {
                this.renameFolder(this.folderContextMenu._targetPath);
            }
            this.hideFolderContextMenu();
        };
        this.folderContextMenu.appendChild(renameFolderOption);

        // Delete Folder option
        const deleteFolderOption = document.createElement('div');
        deleteFolderOption.textContent = 'Delete';
        deleteFolderOption.style.padding = '6px 16px';
        deleteFolderOption.style.cursor = 'pointer';
        deleteFolderOption.onmouseenter = () => deleteFolderOption.style.background = '#eee';
        deleteFolderOption.onmouseleave = () => deleteFolderOption.style.background = 'none';
        deleteFolderOption.onclick = () => {
            if (this.folderContextMenu._targetPath) {
                this.deleteFolder(this.folderContextMenu._targetPath);
            }
            this.hideFolderContextMenu();
        };
        this.folderContextMenu.appendChild(deleteFolderOption);

        document.body.appendChild(this.folderContextMenu);

        // Hide on click elsewhere
        document.addEventListener('mousedown', (e) => {
            if (!this.folderContextMenu.contains(e.target)) {
                this.hideFolderContextMenu();
            }
        });
        // Hide on scroll
        window.addEventListener('scroll', () => this.hideFolderContextMenu(), true);
    }

    showFolderContextMenu(x, y, folderPath) {
        this.folderContextMenu.style.left = x + 'px';
        this.folderContextMenu.style.top = y + 'px';
        this.folderContextMenu.style.display = 'block';
        this.folderContextMenu._targetPath = folderPath;
    }

    hideFolderContextMenu() {
        this.folderContextMenu.style.display = 'none';
        this.folderContextMenu._targetPath = null;
    }

    // Context menu for files
    createFileContextMenu() {
        this.fileContextMenu = document.createElement('div');
        this.fileContextMenu.className = 'asset-folder-context-menu';
        this.fileContextMenu.style.position = 'fixed';
        this.fileContextMenu.style.display = 'none';
        this.fileContextMenu.style.zIndex = 10000;
        this.fileContextMenu.style.background = '#fff';
        this.fileContextMenu.style.border = '1px solid #ccc';
        this.fileContextMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        this.fileContextMenu.style.padding = '4px 0';
        this.fileContextMenu.style.minWidth = '140px';
        this.fileContextMenu.style.fontSize = '13px';

        // Rename File option
        const renameFileOption = document.createElement('div');
        renameFileOption.textContent = 'Rename';
        renameFileOption.style.padding = '6px 16px';
        renameFileOption.style.cursor = 'pointer';
        renameFileOption.onmouseenter = () => renameFileOption.style.background = '#eee';
        renameFileOption.onmouseleave = () => renameFileOption.style.background = 'none';
        renameFileOption.onclick = () => {
            if (this.fileContextMenu._targetAssetId) {
                this.renameFile(this.fileContextMenu._targetAssetId);
            }
            this.hideFileContextMenu();
        };
        this.fileContextMenu.appendChild(renameFileOption);

        // Delete File option
        const deleteFileOption = document.createElement('div');
        deleteFileOption.textContent = 'Delete';
        deleteFileOption.style.padding = '6px 16px';
        deleteFileOption.style.cursor = 'pointer';
        deleteFileOption.onmouseenter = () => deleteFileOption.style.background = '#eee';
        deleteFileOption.onmouseleave = () => deleteFileOption.style.background = 'none';
        deleteFileOption.onclick = () => {
            if (this.fileContextMenu._targetAssetId) {
                this.deleteFile(this.fileContextMenu._targetAssetId);
            }
            this.hideFileContextMenu();
        };
        this.fileContextMenu.appendChild(deleteFileOption);

        // Duplicate File option (optional)
        const duplicateFileOption = document.createElement('div');
        duplicateFileOption.textContent = 'Duplicate';
        duplicateFileOption.style.padding = '6px 16px';
        duplicateFileOption.style.cursor = 'pointer';
        duplicateFileOption.onmouseenter = () => duplicateFileOption.style.background = '#eee';
        duplicateFileOption.onmouseleave = () => duplicateFileOption.style.background = 'none';
        duplicateFileOption.onclick = () => {
            if (this.fileContextMenu._targetAssetId) {
                this.duplicateFile(this.fileContextMenu._targetAssetId);
            }
            this.hideFileContextMenu();
        };
        this.fileContextMenu.appendChild(duplicateFileOption);

        document.body.appendChild(this.fileContextMenu);

        // Hide on click elsewhere
        document.addEventListener('mousedown', (e) => {
            if (!this.fileContextMenu.contains(e.target)) {
                this.hideFileContextMenu();
            }
        });
        // Hide on scroll
        window.addEventListener('scroll', () => this.hideFileContextMenu(), true);
    }

    showFileContextMenu(x, y, assetId) {
        this.fileContextMenu.style.left = x + 'px';
        this.fileContextMenu.style.top = y + 'px';
        this.fileContextMenu.style.display = 'block';
        this.fileContextMenu._targetAssetId = assetId;
    }

    hideFileContextMenu() {
        this.fileContextMenu.style.display = 'none';
        this.fileContextMenu._targetAssetId = null;
    }

    // File/folder operations
    createNewFile(parentPath, type) {
        let fileName = prompt('Enter new file name:');
        if (!fileName) return;
        fileName = fileName.trim();
        if (!fileName) return;
        // Ensure extension
        const ext = type === 'js' ? '.js' : type === 'json' ? '.json' : '.glsl';
        if (!fileName.endsWith(ext)) fileName += ext;
        // Ensure unique name
        const assetsInFolder = this.getAssetsForFolder(parentPath);
        let uniqueName = fileName;
        let i = 1;
        while (assetsInFolder.some(a => a.name === uniqueName)) {
            uniqueName = fileName.replace(ext, '') + ' (' + i + ')' + ext;
            i++;
        }
        // Create a dummy file object (in-memory only)
        const file = new File([''], uniqueName, { type: 'text/plain' });
        this.addAsset(file, 'script', parentPath); // treat as script for now
    }

    renameFile(assetId) {
        const asset = this.assets.get(assetId);
        if (!asset) return;
        let newName = prompt('Rename file:', asset.name);
        if (!newName) return;
        newName = newName.trim();
        if (!newName) return;
        // Ensure unique in folder
        const assetsInFolder = this.getAssetsForFolder(asset.folder);
        let uniqueName = newName;
        let i = 1;
        const ext = asset.name.includes('.') ? asset.name.substring(asset.name.lastIndexOf('.')) : '';
        if (!uniqueName.endsWith(ext)) uniqueName += ext;
        while (assetsInFolder.some(a => a.name === uniqueName && a.id !== asset.id)) {
            uniqueName = newName.replace(ext, '') + ' (' + i + ')' + ext;
            i++;
        }
        asset.name = uniqueName;
        this.refreshAssetGrid();
    }

    deleteFile(assetId) {
        if (!confirm('Delete this file?')) return;
        this.assets.delete(assetId);
        this.refreshAssetGrid();
    }

    duplicateFile(assetId) {
        const asset = this.assets.get(assetId);
        if (!asset) return;
        let newName = asset.name.replace(/(\.[^.]+)$/, ' Copy$1');
        const assetsInFolder = this.getAssetsForFolder(asset.folder);
        let uniqueName = newName;
        let i = 1;
        const ext = asset.name.includes('.') ? asset.name.substring(asset.name.lastIndexOf('.')) : '';
        while (assetsInFolder.some(a => a.name === uniqueName)) {
            uniqueName = newName.replace(ext, '') + ' (' + i + ')' + ext;
            i++;
        }
        // Create a new asset with the same type and folder
        const file = new File([''], uniqueName, { type: 'text/plain' });
        this.addAsset(file, asset.type, asset.folder);
    }

    renameFolder(folderPath) {
        const folder = this.findFolderByPath(folderPath);
        if (!folder) return;
        let newName = prompt('Rename folder:', folder.name);
        if (!newName) return;
        newName = newName.trim();
        if (!newName) return;
        // Ensure unique among siblings
        const parentFolder = this.findParentFolder(folderPath);
        let uniqueName = newName;
        let i = 1;
        while (parentFolder && parentFolder.children.some(f => f.name === uniqueName && f !== folder)) {
            uniqueName = newName + ' (' + i + ')';
            i++;
        }
        // Update path recursively
        const oldPath = folder.path;
        folder.name = uniqueName;
        folder.path = (parentFolder ? parentFolder.path + '/' : '') + uniqueName;
        this.updateFolderPaths(folder, oldPath);
        this.renderFolderTree();
        this.selectFolder(folder.path);
    }

    deleteFolder(folderPath) {
        if (!confirm('Delete this folder and all its contents?')) return;
        const parentFolder = this.findParentFolder(folderPath);
        if (!parentFolder) return;
        const idx = parentFolder.children.findIndex(f => f.path === folderPath);
        if (idx !== -1) {
            parentFolder.children.splice(idx, 1);
        }
        // Remove all assets in this folder and subfolders
        this.deleteAssetsInFolder(folderPath);
        this.renderFolderTree();
        this.selectFolder(parentFolder.path);
    }

    findParentFolder(path) {
        function find(folder, parent) {
            if (folder.path === path) return parent;
            for (const child of folder.children) {
                const found = find(child, folder);
                if (found) return found;
            }
            return null;
        }
        return find(this.folders.get('Assets'), null);
    }

    updateFolderPaths(folder, oldPath) {
        // Recursively update paths for folder and children
        folder.children.forEach(child => {
            const childOldPath = child.path;
            child.path = folder.path + '/' + child.name;
            this.updateFolderPaths(child, childOldPath);
        });
        // Update assets in this folder
        this.assets.forEach(asset => {
            if (asset.folder.startsWith(oldPath)) {
                asset.folder = asset.folder.replace(oldPath, folder.path);
            }
        });
    }

    deleteAssetsInFolder(folderPath) {
        const toDelete = [];
        this.assets.forEach((asset, id) => {
            if (asset.folder === folderPath || asset.folder.startsWith(folderPath + '/')) {
                toDelete.push(id);
            }
        });
        toDelete.forEach(id => this.assets.delete(id));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `asset-notification asset-notification-${type}`;
        notification.textContent = message;
        // Close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.className = 'asset-notification-close';
        closeBtn.onclick = () => {
            notification.remove();
        };
        notification.appendChild(closeBtn);
        this.notificationContainer.appendChild(notification);
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 3000);
    }

    createModalDialog() {
        this.modalBackdrop = document.createElement('div');
        this.modalBackdrop.className = 'asset-modal-backdrop';
        this.modalBackdrop.style.display = 'none';
        document.body.appendChild(this.modalBackdrop);

        this.modalDialog = document.createElement('div');
        this.modalDialog.className = 'asset-modal-dialog';
        this.modalBackdrop.appendChild(this.modalDialog);
    }

    showInputDialog({title = '', message = '', value = '', placeholder = '', okText = 'OK', cancelText = 'Cancel'}) {
        return new Promise((resolve) => {
            this.modalDialog.innerHTML = '';
            const titleElem = document.createElement('div');
            titleElem.className = 'asset-modal-title';
            titleElem.textContent = title;
            this.modalDialog.appendChild(titleElem);
            if (message) {
                const msgElem = document.createElement('div');
                msgElem.className = 'asset-modal-message';
                msgElem.textContent = message;
                this.modalDialog.appendChild(msgElem);
            }
            const input = document.createElement('input');
            input.className = 'asset-modal-input';
            input.type = 'text';
            input.value = value;
            input.placeholder = placeholder;
            this.modalDialog.appendChild(input);
            const btnRow = document.createElement('div');
            btnRow.className = 'asset-modal-btn-row';
            const okBtn = document.createElement('button');
            okBtn.className = 'asset-modal-btn asset-modal-btn-ok';
            okBtn.textContent = okText;
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'asset-modal-btn asset-modal-btn-cancel';
            cancelBtn.textContent = cancelText;
            btnRow.appendChild(okBtn);
            btnRow.appendChild(cancelBtn);
            this.modalDialog.appendChild(btnRow);
            this.modalBackdrop.style.display = 'flex';
            input.focus();
            input.select();
            okBtn.onclick = () => {
                this.modalBackdrop.style.display = 'none';
                resolve(input.value.trim() || null);
            };
            cancelBtn.onclick = () => {
                this.modalBackdrop.style.display = 'none';
                resolve(null);
            };
            input.onkeydown = (e) => {
                if (e.key === 'Enter') okBtn.click();
                if (e.key === 'Escape') cancelBtn.click();
            };
        });
    }

    showConfirmDialog({title = '', message = '', okText = 'OK', cancelText = 'Cancel'}) {
        return new Promise((resolve) => {
            this.modalDialog.innerHTML = '';
            const titleElem = document.createElement('div');
            titleElem.className = 'asset-modal-title';
            titleElem.textContent = title;
            this.modalDialog.appendChild(titleElem);
            if (message) {
                const msgElem = document.createElement('div');
                msgElem.className = 'asset-modal-message';
                msgElem.textContent = message;
                this.modalDialog.appendChild(msgElem);
            }
            const btnRow = document.createElement('div');
            btnRow.className = 'asset-modal-btn-row';
            const okBtn = document.createElement('button');
            okBtn.className = 'asset-modal-btn asset-modal-btn-ok';
            okBtn.textContent = okText;
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'asset-modal-btn asset-modal-btn-cancel';
            cancelBtn.textContent = cancelText;
            btnRow.appendChild(okBtn);
            btnRow.appendChild(cancelBtn);
            this.modalDialog.appendChild(btnRow);
            this.modalBackdrop.style.display = 'flex';
            okBtn.focus();
            okBtn.onclick = () => {
                this.modalBackdrop.style.display = 'none';
                resolve(true);
            };
            cancelBtn.onclick = () => {
                this.modalBackdrop.style.display = 'none';
                resolve(false);
            };
        });
    }
}

export default AssetBrowser;