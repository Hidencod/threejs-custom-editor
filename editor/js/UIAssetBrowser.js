import { UIPanel, UIRow, UIText, UIInput, UIButton } from './libs/ui.js';

class UIAssetBrowser {
    constructor(editor) {
        this.editor = editor;
        this.folders = [
            { path: 'Assets', name: 'Assets', children: [], expanded: true }
        ];
        this.currentFolder = 'Assets';
        this.assets = [
            { id: '1', name: 'Cube.gltf', type: 'model', folder: 'Assets' },
            { id: '2', name: 'Texture.png', type: 'texture', folder: 'Assets' },
            { id: '3', name: 'Material.mat', type: 'material', folder: 'Assets' }
        ];
        this.renamingAssetId = null;
        this.folderContextMenu = null;
        this.assetContextMenu = null;
        this.defaultHeight = 300;
        this.minHeight = 120;
        this.maxHeight = 600;
        this.container = new UIPanel();
        this.container.setId('ui-asset-browser');
        this.container.setDisplay('none');
        this.container.setStyle('position', ['fixed']);
        this.container.setStyle('left', ['0']);
        this.container.setStyle('right', ['0']);
        this.container.setStyle('bottom', ['0']);
        this.container.setStyle('width', ['100vw']);
        this.container.setStyle('height', [this.defaultHeight + 'px']);
        this.container.setStyle('background', ['#222']);
        this.container.setStyle('z-index', ['1000']);
        this.container.setStyle('overflow', ['hidden']);
        this.container.setStyle('font-family', ['Segoe UI, Arial, sans-serif']);
        this.createResizeHandle();
        this.createHeader();
        this.createMainContent();
        document.body.appendChild(this.container.dom);
        document.addEventListener('click', () => { this.hideFolderContextMenu(); this.hideAssetContextMenu(); });
        this.updateMainUILayout(this.defaultHeight);
    }

    createResizeHandle() {
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.style.height = '6px';
        this.resizeHandle.style.cursor = 'ns-resize';
        this.resizeHandle.style.background = 'linear-gradient(to bottom, #444 60%, #222 100%)';
        this.resizeHandle.style.position = 'absolute';
        this.resizeHandle.style.top = '0';
        this.resizeHandle.style.left = '0';
        this.resizeHandle.style.right = '0';
        this.resizeHandle.style.zIndex = '1100';
        this.container.dom.appendChild(this.resizeHandle);

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        this.resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = this.container.dom.offsetHeight;
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const delta = startY - e.clientY;
            let newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, startHeight + delta));
            this.container.setStyle('height', [newHeight + 'px']);
            this.updateMainUILayout(newHeight);
        });
        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.userSelect = '';
            }
        });
    }

    updateMainUILayout(assetBrowserHeight) {
        const px = assetBrowserHeight + 'px';
        
        // Method 1: Add padding-bottom to body to push all content up
        document.body.style.paddingBottom = px;
        
        // Method 2: Find and adjust the main container
        // Three.js editor typically has a main container that holds the viewport
        const mainContainer = document.querySelector('body > div:first-child') || 
                             document.querySelector('.main-container') ||
                             document.querySelector('#container') ||
                             document.querySelector('#main');
        
        if (mainContainer) {
            mainContainer.style.paddingBottom = px;
            console.log('Applied padding to main container');
        }
        
        // Method 3: Adjust viewport container specifically
        // Look for the viewport container (usually the parent of canvas)
        const canvas = document.querySelector('canvas');
        if (canvas) {
            let viewportContainer = canvas.parentElement;
            
            // Go up the DOM tree to find the main viewport container
            while (viewportContainer && viewportContainer !== document.body) {
                const computedStyle = window.getComputedStyle(viewportContainer);
                
                // If this container takes up most of the viewport, adjust it
                if (computedStyle.position === 'absolute' || 
                    computedStyle.position === 'fixed' ||
                    viewportContainer.offsetHeight > window.innerHeight * 0.5) {
                    
                    viewportContainer.style.paddingBottom = px;
                    console.log('Applied padding to viewport container:', viewportContainer);
                    break;
                }
                
                viewportContainer = viewportContainer.parentElement;
            }
        }
        
        // Method 4: Use CSS custom property for responsive design
        document.documentElement.style.setProperty('--asset-browser-height', px);
        
        // Method 5: Resize canvas if needed
        if (canvas) {
            // Trigger resize event so Three.js can adjust
            window.dispatchEvent(new Event('resize'));
            
            // If canvas has fixed dimensions, adjust them
            const canvasHeight = canvas.offsetHeight;
            const newCanvasHeight = window.innerHeight - assetBrowserHeight - 50; // 50px buffer for menu
            
            if (canvasHeight > newCanvasHeight) {
                canvas.style.height = newCanvasHeight + 'px';
                console.log('Adjusted canvas height');
            }
        }
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('assetBrowserResize', {
            detail: { height: assetBrowserHeight }
        }));
        
        console.log(`Asset browser height: ${assetBrowserHeight}px`);

        const viewport = document.getElementById('viewport');
        if (viewport) {
            viewport.style.marginBottom = px;
            // Set height so it fills the space above the asset browser
            viewport.style.height = `calc(100vh - ${assetBrowserHeight}px - 40px)`; // 40px for menubar
        }
    }

    createHeader() {
        const header = new UIPanel();
        header.setStyle('padding', ['8px 12px']);
        header.setStyle('border-bottom', ['1px solid #333']);
        header.setStyle('font-size', ['15px']);
        header.setStyle('background', ['#232323']);
        header.setStyle('display', ['flex']);
        header.setStyle('align-items', ['center']);
        header.add(new UIText('Asset Browser'));
        this.container.add(header);
    }

    createMainContent() {
        const mainPanel = new UIPanel();
        mainPanel.setStyle('display', ['flex']);
        mainPanel.setStyle('height', ['calc(100% - 40px)']);
        // Folder panel
        this.folderPanel = new UIPanel();
        this.folderPanel.setStyle('width', ['180px']);
        this.folderPanel.setStyle('background', ['#191919']);
        this.folderPanel.setStyle('border-right', ['1px solid #444']);
        this.folderPanel.setStyle('padding', ['8px 0']);
        this.folderPanel.setStyle('overflow-y', ['auto']);
        this.refreshFolderTree();
        mainPanel.add(this.folderPanel);
        // Asset list panel
        this.assetListPanel = new UIPanel();
        this.assetListPanel.setStyle('flex', ['1']);
        this.assetListPanel.setStyle('padding', ['12px 16px']);
        this.assetListPanel.setStyle('overflow-y', ['auto']);
        this.assetListPanel.dom.addEventListener('contextmenu', (e) => {
            // Only show if not right-clicking on an asset row
            if (!e.target.closest('.ui-asset-row')) {
                e.preventDefault();
                e.stopPropagation();
                this.showAssetListContextMenu(e.clientX, e.clientY);
            }
        });
        this.refreshAssetList();
        mainPanel.add(this.assetListPanel);
        this.container.add(mainPanel);
    }

    // Recursive rendering of folder tree with collapsible nodes and icons
    refreshFolderTree() {
        this.folderPanel.clear();
        this.renderFolderNode(this.folders[0], 0);
    }

    renderFolderNode(folder, depth) {
        const row = new UIRow();
        row.setStyle('display', ['flex']);
        row.setStyle('align-items', ['center']);
        row.setStyle('padding', ['2px 8px 2px 0']);
        row.setStyle('margin-bottom', ['2px']);
        row.setStyle('font-size', ['14px']);
        row.setStyle('border-radius', ['3px']);
        row.setStyle('margin-left', [depth * 16 + 'px']);
        row.setStyle('cursor', ['pointer']);
        if (this.currentFolder === folder.path) {
            row.setStyle('background', ['#333']);
            row.setStyle('font-weight', ['bold']);
            row.setStyle('color', ['#fff']);
        } else {
            row.setStyle('color', ['#bbb']);
        }
        row.dom.onmouseenter = () => {
            if (this.currentFolder !== folder.path) row.setStyle('background', ['#292929']);
        };
        row.dom.onmouseleave = () => {
            if (this.currentFolder !== folder.path) row.setStyle('background', ['']);
        };
        // Toggle button if folder has children
        if (folder.children && folder.children.length > 0) {
            const toggle = document.createElement('span');
            toggle.textContent = folder.expanded ? '▼' : '▶';
            toggle.style.cursor = 'pointer';
            toggle.style.marginRight = '4px';
            toggle.style.color = '#aaa';
            toggle.onclick = (e) => {
                e.stopPropagation();
                folder.expanded = !folder.expanded;
                this.refreshFolderTree();
            };
            row.dom.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.style.display = 'inline-block';
            spacer.style.width = '16px';
            row.dom.appendChild(spacer);
        }
        // Folder icon
        const icon = document.createElement('span');
        icon.textContent = folder.expanded ? '📂' : '📁';
        icon.style.marginRight = '6px';
        row.dom.appendChild(icon);
        // Folder name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = folder.name;
        row.dom.appendChild(nameSpan);
        row.onClick(() => {
            this.currentFolder = folder.path;
            this.refreshFolderTree();
            this.refreshAssetList();
        });
        row.dom.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showFolderContextMenu(e.clientX, e.clientY, folder);
        });
        this.folderPanel.add(row);
        if (folder.expanded && folder.children && folder.children.length > 0) {
            folder.children.forEach(child => this.renderFolderNode(child, depth + 1));
        }
    }

    showFolderContextMenu(x, y, folder) {
        this.hideFolderContextMenu();
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = '#222';
        menu.style.border = '1px solid #444';
        menu.style.zIndex = '3000';
        menu.style.padding = '0';
        menu.style.minWidth = '120px';
        menu.style.boxShadow = '0 2px 8px #000a';
        menu.className = 'ui-asset-folder-context-menu';
        // Add Folder
        const add = document.createElement('div');
        add.textContent = 'Add Folder';
        add.style.padding = '8px';
        add.style.cursor = 'pointer';
        add.onmouseenter = () => add.style.background = '#333';
        add.onmouseleave = () => add.style.background = '';
        add.onclick = (e) => {
            e.stopPropagation();
            this.hideFolderContextMenu();
            this.showAddFolderDialog(folder);
        };
        menu.appendChild(add);
        // Rename Folder
        const rename = document.createElement('div');
        rename.textContent = 'Rename Folder';
        rename.style.padding = '8px';
        rename.style.cursor = 'pointer';
        rename.onmouseenter = () => rename.style.background = '#333';
        rename.onmouseleave = () => rename.style.background = '';
        rename.onclick = (e) => {
            e.stopPropagation();
            this.hideFolderContextMenu();
            this.showRenameFolderDialog(folder);
        };
        menu.appendChild(rename);
        // Delete Folder (not root)
        if (folder.path !== 'Assets') {
            const del = document.createElement('div');
            del.textContent = 'Delete Folder';
            del.style.padding = '8px';
            del.style.cursor = 'pointer';
            del.style.color = '#f55';
            del.onmouseenter = () => del.style.background = '#333';
            del.onmouseleave = () => del.style.background = '';
            del.onclick = (e) => {
                e.stopPropagation();
                this.hideFolderContextMenu();
                this.showDeleteFolderConfirm(folder);
            };
            menu.appendChild(del);
        }
        document.body.appendChild(menu);
        this.folderContextMenu = menu;
    }

    hideFolderContextMenu() {
        if (this.folderContextMenu) {
            document.body.removeChild(this.folderContextMenu);
            this.folderContextMenu = null;
        }
    }

    showAddFolderDialog(parentFolder) {
        const dialog = new UIPanel();
        dialog.setStyle('position', ['fixed']);
        dialog.setStyle('top', ['50%']);
        dialog.setStyle('left', ['50%']);
        dialog.setStyle('transform', ['translate(-50%, -50%)']);
        dialog.setStyle('background', ['#333']);
        dialog.setStyle('padding', ['24px']);
        dialog.setStyle('z-index', ['4000']);
        dialog.setStyle('border-radius', ['8px']);
        dialog.setStyle('box-shadow', ['0 2px 8px #000a']);
        dialog.add(new UIText('New Folder Name:'));
        const input = new UIInput('New Folder');
        dialog.add(input);
        const addBtn = new UIButton('Add').onClick(() => {
            this.addFolder(parentFolder, input.getValue());
            document.body.removeChild(dialog.dom);
        });
        dialog.add(addBtn);
        const cancelBtn = new UIButton('Cancel').onClick(() => {
            document.body.removeChild(dialog.dom);
        });
        dialog.add(cancelBtn);
        document.body.appendChild(dialog.dom);
    }

    addFolder(parentFolder, name) {
        if (!name.trim()) return;
        const newPath = parentFolder.path + '/' + name;
        const newFolder = { path: newPath, name, children: [], expanded: true };
        parentFolder.children = parentFolder.children || [];
        parentFolder.children.push(newFolder);
        this.refreshFolderTree();
        this.refreshAssetList();
    }

    showRenameFolderDialog(folder) {
        const dialog = new UIPanel();
        dialog.setStyle('position', ['fixed']);
        dialog.setStyle('top', ['50%']);
        dialog.setStyle('left', ['50%']);
        dialog.setStyle('transform', ['translate(-50%, -50%)']);
        dialog.setStyle('background', ['#333']);
        dialog.setStyle('padding', ['24px']);
        dialog.setStyle('z-index', ['4000']);
        dialog.setStyle('border-radius', ['8px']);
        dialog.setStyle('box-shadow', ['0 2px 8px #000a']);
        dialog.add(new UIText('Rename Folder:'));
        const input = new UIInput(folder.name);
        dialog.add(input);
        const saveBtn = new UIButton('Save').onClick(() => {
            this.renameFolder(folder, input.getValue());
            document.body.removeChild(dialog.dom);
        });
        dialog.add(saveBtn);
        const cancelBtn = new UIButton('Cancel').onClick(() => {
            document.body.removeChild(dialog.dom);
        });
        dialog.add(cancelBtn);
        document.body.appendChild(dialog.dom);
    }

    renameFolder(folder, newName) {
        if (!newName.trim()) return;
        const oldPath = folder.path;
        folder.name = newName;
        folder.path = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
        this.assets.forEach(asset => {
            if (asset.folder === oldPath) {
                asset.folder = folder.path;
            }
        });
        this.updateChildFolderPaths(folder, oldPath);
        this.refreshFolderTree();
        this.refreshAssetList();
    }

    updateChildFolderPaths(folder, oldParentPath) {
        if (!folder.children) return;
        folder.children.forEach(child => {
            const oldChildPath = child.path;
            child.path = folder.path + oldChildPath.substring(oldParentPath.length);
            this.assets.forEach(asset => {
                if (asset.folder === oldChildPath) {
                    asset.folder = child.path;
                }
            });
            this.updateChildFolderPaths(child, oldChildPath);
        });
    }

    showDeleteFolderConfirm(folder) {
        const dialog = new UIPanel();
        dialog.setStyle('position', ['fixed']);
        dialog.setStyle('top', ['50%']);
        dialog.setStyle('left', ['50%']);
        dialog.setStyle('transform', ['translate(-50%, -50%)']);
        dialog.setStyle('background', ['#333']);
        dialog.setStyle('padding', ['24px']);
        dialog.setStyle('z-index', ['4000']);
        dialog.setStyle('border-radius', ['8px']);
        dialog.setStyle('box-shadow', ['0 2px 8px #000a']);
        dialog.add(new UIText('Delete this folder and all its assets?'));
        const yesBtn = new UIButton('Yes').onClick(() => {
            this.deleteFolder(folder);
            document.body.removeChild(dialog.dom);
        });
        dialog.add(yesBtn);
        const noBtn = new UIButton('No').onClick(() => {
            document.body.removeChild(dialog.dom);
        });
        dialog.add(noBtn);
        document.body.appendChild(dialog.dom);
    }

    deleteFolder(folder) {
        this.deleteAssetsInFolder(folder.path);
        if (folder.path === 'Assets') return;
        this.removeFolderFromTree(this.folders[0], folder.path);
        if (this.currentFolder === folder.path) {
            this.currentFolder = 'Assets';
        }
        this.refreshFolderTree();
        this.refreshAssetList();
    }

    removeFolderFromTree(parent, pathToRemove) {
        if (!parent.children) return;
        parent.children = parent.children.filter(child => {
            if (child.path === pathToRemove) return false;
            this.removeFolderFromTree(child, pathToRemove);
            return true;
        });
    }

    deleteAssetsInFolder(folderPath) {
        this.assets = this.assets.filter(asset => !asset.folder.startsWith(folderPath));
    }

    refreshAssetList() {
        this.assetListPanel.clear();
        // Show immediate subfolders of the current folder
        let currentFolderObj = this.folders[0];
        const find = (f) => { if (f.path === this.currentFolder) currentFolderObj = f; else if (f.children) f.children.forEach(find); };
        find(this.folders[0]);
        if (currentFolderObj.children && currentFolderObj.children.length > 0) {
            currentFolderObj.children.forEach(child => {
                const row = new UIRow();
                row.setClass('ui-asset-folder-row');
                row.setStyle('display', ['flex']);
                row.setStyle('align-items', ['center']);
                row.setStyle('padding', ['4px 0']);
                row.setStyle('font-size', ['14px']);
                row.setStyle('border-radius', ['3px']);
                row.setStyle('margin-bottom', ['2px']);
                row.setStyle('cursor', ['pointer']);
                row.setStyle('color', ['#ffb700']);
                row.dom.onmouseenter = () => row.setStyle('background', ['#292929']);
                row.dom.onmouseleave = () => row.setStyle('background', ['']);
                // Folder icon
                const icon = document.createElement('span');
                icon.textContent = '📁';
                icon.style.marginRight = '8px';
                row.dom.appendChild(icon);
                // Folder name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = child.name;
                row.dom.appendChild(nameSpan);
                // Click to select folder
                row.onClick(() => {
                    this.currentFolder = child.path;
                    this.refreshFolderTree();
                    this.refreshAssetList();
                });
                // Right-click context menu for folder
                row.dom.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showFolderContextMenu(e.clientX, e.clientY, child);
                });
                this.assetListPanel.add(row);
            });
        }
        // Show files in the current folder
        const assetsInFolder = this.assets.filter(a => a.folder === this.currentFolder);
        assetsInFolder.forEach(asset => {
            const row = new UIRow();
            row.setClass('ui-asset-row');
            row.setStyle('display', ['flex']);
            row.setStyle('align-items', ['center']);
            row.setStyle('padding', ['4px 0']);
            row.setStyle('font-size', ['14px']);
            row.setStyle('border-radius', ['3px']);
            row.setStyle('margin-bottom', ['2px']);
            row.setStyle('cursor', ['pointer']);
            row.setStyle('color', ['#eee']);
            row.dom.onmouseenter = () => row.setStyle('background', ['#292929']);
            row.dom.onmouseleave = () => row.setStyle('background', ['']);
            // File icon
            const icon = document.createElement('span');
            icon.textContent = '📄';
            icon.style.marginRight = '8px';
            row.dom.appendChild(icon);
            // Name or input for renaming
            if (this.renamingAssetId === asset.id) {
                const input = new UIInput(asset.name);
                input.setStyle('width', ['160px']);
                row.add(input);
                const saveBtn = new UIButton('Save').onClick(() => {
                    this.renameAsset(asset.id, input.getValue());
                });
                saveBtn.setStyle('margin-left', ['8px']);
                saveBtn.setStyle('padding', ['2px 8px']);
                saveBtn.setStyle('font-size', ['13px']);
                saveBtn.setStyle('background', ['#333']);
                saveBtn.setStyle('color', ['#bbb']);
                saveBtn.setStyle('border', ['1px solid #444']);
                saveBtn.setStyle('border-radius', ['3px']);
                saveBtn.setStyle('cursor', ['pointer']);
                saveBtn.dom.onmouseenter = () => saveBtn.setStyle('background', ['#444']);
                saveBtn.dom.onmouseleave = () => saveBtn.setStyle('background', ['#333']);
                row.add(saveBtn);
                const cancelBtn = new UIButton('Cancel').onClick(() => {
                    this.renamingAssetId = null;
                    this.refreshAssetList();
                });
                cancelBtn.setStyle('margin-left', ['4px']);
                cancelBtn.setStyle('padding', ['2px 8px']);
                cancelBtn.setStyle('font-size', ['13px']);
                cancelBtn.setStyle('background', ['#333']);
                cancelBtn.setStyle('color', ['#bbb']);
                cancelBtn.setStyle('border', ['1px solid #444']);
                cancelBtn.setStyle('border-radius', ['3px']);
                cancelBtn.setStyle('cursor', ['pointer']);
                cancelBtn.dom.onmouseenter = () => cancelBtn.setStyle('background', ['#444']);
                cancelBtn.dom.onmouseleave = () => cancelBtn.setStyle('background', ['#333']);
                row.add(cancelBtn);
            } else {
                const nameSpan = document.createElement('span');
                nameSpan.textContent = asset.name;
                nameSpan.style.width = '180px';
                nameSpan.style.display = 'inline-block';
                row.dom.appendChild(nameSpan);
            }
            // Right-click context menu for asset
            row.dom.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAssetContextMenu(e.clientX, e.clientY, asset);
            });
            this.assetListPanel.add(row);
        });
    }

    showAssetListContextMenu(x, y) {
        this.hideAssetContextMenu();
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = '#222';
        menu.style.border = '1px solid #444';
        menu.style.zIndex = '3000';
        menu.style.padding = '0';
        menu.style.minWidth = '140px';
        menu.style.boxShadow = '0 2px 8px #000a';
        menu.className = 'ui-asset-list-context-menu';
        // Create group with submenu
        const create = document.createElement('div');
        create.textContent = 'Create ▶';
        create.style.padding = '8px';
        create.style.cursor = 'pointer';
        create.onmouseenter = () => {
            create.style.background = '#333';
            submenu.style.display = 'block';
        };
        create.onmouseleave = () => {
            create.style.background = '';
            submenu.style.display = 'none';
        };
        // Submenu
        const submenu = document.createElement('div');
        submenu.style.position = 'absolute';
        submenu.style.left = '140px';
        submenu.style.top = '0';
        submenu.style.background = '#222';
        submenu.style.border = '1px solid #444';
        submenu.style.zIndex = '3100';
        submenu.style.minWidth = '120px';
        submenu.style.boxShadow = '0 2px 8px #000a';
        submenu.style.display = 'none';
        // Folder
        const folder = document.createElement('div');
        folder.textContent = 'Folder';
        folder.style.padding = '8px';
        folder.style.cursor = 'pointer';
        folder.onmouseenter = () => folder.style.background = '#333';
        folder.onmouseleave = () => folder.style.background = '';
        folder.onclick = (e) => {
            e.stopPropagation();
            this.hideAssetContextMenu();
            // Find current folder object
            let parentFolder = this.folders[0];
            const find = (f) => { if (f.path === this.currentFolder) parentFolder = f; else if (f.children) f.children.forEach(find); };
            find(this.folders[0]);
            this.showAddFolderDialog(parentFolder);
        };
        submenu.appendChild(folder);
        // JS Script
        const jsScript = document.createElement('div');
        jsScript.textContent = 'JS Script';
        jsScript.style.padding = '8px';
        jsScript.style.cursor = 'pointer';
        jsScript.onmouseenter = () => jsScript.style.background = '#333';
        jsScript.onmouseleave = () => jsScript.style.background = '';
        jsScript.onclick = (e) => {
            e.stopPropagation();
            this.hideAssetContextMenu();
            this.showAddAssetInput('script.js');
        };
        submenu.appendChild(jsScript);
        // JSON
        const json = document.createElement('div');
        json.textContent = 'JSON';
        json.style.padding = '8px';
        json.style.cursor = 'pointer';
        json.onmouseenter = () => json.style.background = '#333';
        json.onmouseleave = () => json.style.background = '';
        json.onclick = (e) => {
            e.stopPropagation();
            this.hideAssetContextMenu();
            this.showAddAssetInput('data.json');
        };
        submenu.appendChild(json);
        create.appendChild(submenu);
        menu.appendChild(create);
        document.body.appendChild(menu);
        this.assetContextMenu = menu;
    }

    showAddAssetInput(defaultName = 'NewAsset') {
        this.assetListPanel.clear();
        const row = new UIRow();
        row.setStyle('color', ['#fff']);
        const input = new UIInput(defaultName);
        row.add(input);
        const addBtn = new UIButton('Add').onClick(() => {
            this.addAsset(input.getValue());
        });
        addBtn.setStyle('margin-left', ['8px']);
        addBtn.setStyle('padding', ['2px 8px']);
        addBtn.setStyle('font-size', ['13px']);
        addBtn.setStyle('background', ['#333']);
        addBtn.setStyle('color', ['#bbb']);
        addBtn.setStyle('border', ['1px solid #444']);
        addBtn.setStyle('border-radius', ['3px']);
        addBtn.setStyle('cursor', ['pointer']);
        addBtn.dom.onmouseenter = () => addBtn.setStyle('background', ['#444']);
        addBtn.dom.onmouseleave = () => addBtn.setStyle('background', ['#333']);
        row.add(addBtn);
        const cancelBtn = new UIButton('Cancel').onClick(() => {
            this.refreshAssetList();
        });
        cancelBtn.setStyle('margin-left', ['4px']);
        cancelBtn.setStyle('padding', ['2px 8px']);
        cancelBtn.setStyle('font-size', ['13px']);
        cancelBtn.setStyle('background', ['#333']);
        cancelBtn.setStyle('color', ['#bbb']);
        cancelBtn.setStyle('border', ['1px solid #444']);
        cancelBtn.setStyle('border-radius', ['3px']);
        cancelBtn.setStyle('cursor', ['pointer']);
        cancelBtn.dom.onmouseenter = () => cancelBtn.setStyle('background', ['#444']);
        cancelBtn.dom.onmouseleave = () => cancelBtn.setStyle('background', ['#333']);
        row.add(cancelBtn);
        this.assetListPanel.add(row);
        // Add the rest of the assets below
        const assetsInFolder = this.assets.filter(a => a.folder === this.currentFolder);
        assetsInFolder.forEach(asset => {
            const assetRow = new UIRow();
            assetRow.setClass('ui-asset-row');
            assetRow.setStyle('color', ['#fff']);
            assetRow.setTextContent(asset.name);
            assetRow.dom.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAssetContextMenu(e.clientX, e.clientY, asset);
            });
            this.assetListPanel.add(assetRow);
        });
    }

    addAsset(name) {
        if (!name.trim()) return;
        this.assets.push({ id: Date.now().toString(), name, type: 'custom', folder: this.currentFolder });
        this.refreshAssetList();
        this.refreshFolderTree();
    }

    renameAsset(id, newName) {
        const asset = this.assets.find(a => a.id === id);
        if (asset && newName.trim()) {
            asset.name = newName;
        }
        this.renamingAssetId = null;
        this.refreshAssetList();
        this.refreshFolderTree();
    }

    showDeleteConfirm(id) {
        const confirmPanel = new UIPanel();
        confirmPanel.setStyle('position', ['fixed']);
        confirmPanel.setStyle('top', ['50%']);
        confirmPanel.setStyle('left', ['50%']);
        confirmPanel.setStyle('transform', ['translate(-50%, -50%)']);
        confirmPanel.setStyle('background', ['#333']);
        confirmPanel.setStyle('padding', ['24px']);
        confirmPanel.setStyle('z-index', ['2000']);
        confirmPanel.setStyle('border-radius', ['8px']);
        confirmPanel.setStyle('box-shadow', ['0 2px 8px #000a']);
        confirmPanel.add(new UIText('Delete this asset?'));
        const yesBtn = new UIButton('Yes').onClick(() => {
            this.deleteAsset(id);
            document.body.removeChild(confirmPanel.dom);
        });
        confirmPanel.add(yesBtn);
        const noBtn = new UIButton('No').onClick(() => {
            document.body.removeChild(confirmPanel.dom);
        });
        confirmPanel.add(noBtn);
        document.body.appendChild(confirmPanel.dom);
    }

    deleteAsset(id) {
        this.assets = this.assets.filter(a => a.id !== id);
        this.refreshAssetList();
        this.refreshFolderTree();
    }

    showAssetContextMenu(x, y, asset) {
        this.hideAssetContextMenu();
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = '#222';
        menu.style.border = '1px solid #444';
        menu.style.zIndex = '3000';
        menu.style.padding = '0';
        menu.style.minWidth = '120px';
        menu.style.boxShadow = '0 2px 8px #000a';
        menu.className = 'ui-asset-context-menu';
        // Rename
        const rename = document.createElement('div');
        rename.textContent = 'Rename';
        rename.style.padding = '8px';
        rename.style.cursor = 'pointer';
        rename.onmouseenter = () => rename.style.background = '#333';
        rename.onmouseleave = () => rename.style.background = '';
        rename.onclick = (e) => {
            e.stopPropagation();
            this.renamingAssetId = asset.id;
            this.refreshAssetList();
            this.hideAssetContextMenu();
        };
        menu.appendChild(rename);
        // Delete
        const del = document.createElement('div');
        del.textContent = 'Delete';
        del.style.padding = '8px';
        del.style.cursor = 'pointer';
        del.style.color = '#f55';
        del.onmouseenter = () => del.style.background = '#333';
        del.onmouseleave = () => del.style.background = '';
        del.onclick = (e) => {
            e.stopPropagation();
            this.showDeleteConfirm(asset.id);
            this.hideAssetContextMenu();
        };
        menu.appendChild(del);
        document.body.appendChild(menu);
        this.assetContextMenu = menu;
    }

    hideAssetContextMenu() {
        if (this.assetContextMenu) {
            document.body.removeChild(this.assetContextMenu);
            this.assetContextMenu = null;
        }
    }

    show() {
        this.container.setDisplay('block');
    }

    hide() {
        this.container.setDisplay('none');
    }
}

export { UIAssetBrowser };