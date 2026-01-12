// MD Viewer - 纯前端版本 (使用 File System Access API)
class MDViewerStandalone {
    constructor() {
        this.directoryHandle = null;
        this.currentFileHandle = null;
        this.currentContent = '';
        this.isModified = false;
        this.viewMode = 'split'; // 默认分栏模式
        this.fileHandles = new Map();
        this.manualEncoding = 'auto';
        this.splitRatio = 50; // 分栏比例（百分比）
        this.isResizing = false;
        this.dbName = 'md-viewer-db';
        this.storeName = 'folders';
        this.recentFoldersStore = 'recentFolders';
        this.maxRecentFolders = 10; // 最多保存10个最近目录
        
        // 同步滚动相关标志
        this.isEditorScrolling = false;
        this.isPreviewScrolling = false;
        this.syncScrollTimeout = null;
        
        this.initElements();
        this.initMarked();
        this.bindEvents();
        this.loadTheme();
        this.checkBrowserSupport();
        this.initDB().then(() => {
            this.restoreLastFolder();
            this.loadRecentFolders();
        });
        this.initDiagramZoom();
    }
    
    // 检查浏览器支持
    checkBrowserSupport() {
        if (!('showDirectoryPicker' in window)) {
            this.showToast('您的浏览器不支持文件系统访问 API，建议使用最新版 Chrome/Edge', 'warning');
            this.fileTree.innerHTML = `
                <div class="empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p style="color: #dc3545;">浏览器不支持</p>
                    <p style="font-size: 12px;">请使用 Chrome、Edge 或其他支持 File System Access API 的浏览器</p>
                </div>
            `;
        } else {
            this.fileTree.innerHTML = `
                <div class="empty">
                    <i class="fas fa-folder-open"></i>
                    <p>点击"打开文件夹"开始</p>
                    <p style="font-size: 12px;">选择包含 Markdown 文件的文件夹</p>
                </div>
            `;
        }
    }
    
    // 初始化 IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 2); // 升级版本号以支持新的store
            
            request.onerror = () => {
                console.error('无法打开数据库');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
                // 为最近文件夹创建新的object store
                if (!db.objectStoreNames.contains(this.recentFoldersStore)) {
                    db.createObjectStore(this.recentFoldersStore, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }
    
    // 保存文件夹句柄到 IndexedDB
    async saveFolderHandle(handle) {
        if (!this.db || !handle) return;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            await store.put(handle, 'lastFolder');
            console.log('文件夹句柄已保存');
        } catch (error) {
            console.error('保存文件夹句柄失败:', error);
        }
    }
    
    // 从 IndexedDB 恢复文件夹句柄
    async restoreLastFolder() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('lastFolder');
            
            return new Promise((resolve) => {
                request.onsuccess = async () => {
                    const handle = request.result;
                    if (handle) {
                        // 检查是否仍有访问权限
                        const options = { mode: 'read' };
                        const permission = await handle.queryPermission(options);
                        
                        if (permission === 'granted') {
                            this.directoryHandle = handle;
                            this.showToast(`已自动打开上次的文件夹: ${handle.name}`, 'success');
                            await this.loadFiles();
                        } else if (permission === 'prompt') {
                            // 请求权限
                            const newPermission = await handle.requestPermission(options);
                            if (newPermission === 'granted') {
                                this.directoryHandle = handle;
                                this.showToast(`已恢复上次的文件夹: ${handle.name}`, 'success');
                                await this.loadFiles();
                            } else {
                                console.log('用户拒绝了访问权限');
                                this.fileTree.innerHTML = `
                                    <div class="empty">
                                        <i class="fas fa-folder-open"></i>
                                        <p>点击"打开文件夹"开始</p>
                                        <p style="font-size: 12px;">上次的文件夹需要重新授权</p>
                                    </div>
                                `;
                            }
                        } else {
                            console.log('没有访问权限');
                        }
                    }
                    resolve();
                };
                
                request.onerror = () => {
                    console.error('恢复文件夹句柄失败:', request.error);
                    resolve();
                };
            });
        } catch (error) {
            console.error('恢复上次文件夹失败:', error);
        }
    }
    
    // 添加文件夹到最近列表
    async addToRecentFolders(handle) {
        if (!this.db || !handle) return;
        
        try {
            // 先获取所有文件夹
            const folders = await this.getAllRecentFolders();
            
            // 检查是否已存在（通过name判断）
            const existingFolder = folders.find(f => f.name === handle.name);
            const existingId = existingFolder ? existingFolder.id : null;
            
            // 确定需要删除的旧文件夹ID
            let oldestId = null;
            if (!existingId && folders.length >= this.maxRecentFolders) {
                // 如果不是更新现有项，且已达到上限，需要删除最旧的
                const sortedFolders = [...folders].sort((a, b) => a.timestamp - b.timestamp);
                oldestId = sortedFolders[0].id;
            }
            
            // 创建新的事务进行写操作
            const transaction = this.db.transaction([this.recentFoldersStore], 'readwrite');
            const store = transaction.objectStore(this.recentFoldersStore);
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('文件夹已添加到最近列表:', handle.name);
                    // 重新加载最近文件夹列表（不使用await）
                    this.loadRecentFolders()
                        .then(() => resolve())
                        .catch(err => {
                            console.error('重新加载文件夹列表失败:', err);
                            resolve(); // 仍然resolve，因为添加操作已成功
                        });
                };
                
                transaction.onerror = () => {
                    console.error('添加到最近文件夹失败:', transaction.error);
                    reject(transaction.error);
                };
                
                // 如果已存在，删除旧的
                if (existingId) {
                    store.delete(existingId);
                }
                
                // 如果需要删除最旧的
                if (oldestId) {
                    store.delete(oldestId);
                }
                
                // 添加新的到列表
                const newEntry = {
                    handle: handle,
                    name: handle.name,
                    timestamp: Date.now()
                };
                store.add(newEntry);
            });
        } catch (error) {
            console.error('添加到最近文件夹失败:', error);
        }
    }
    
    // 获取所有最近文件夹（辅助方法）
    async getAllRecentFolders() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction([this.recentFoldersStore], 'readonly');
        const store = transaction.objectStore(this.recentFoldersStore);
        const request = store.getAll();
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error('获取最近文件夹失败:', request.error);
                resolve([]);
            };
        });
    }
    
    // 加载最近文件夹列表
    async loadRecentFolders() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.recentFoldersStore], 'readonly');
            const store = transaction.objectStore(this.recentFoldersStore);
            const request = store.getAll();
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    let folders = request.result || [];
                    // 按时间戳降序排序（最新的在前）
                    folders.sort((a, b) => b.timestamp - a.timestamp);
                    this.renderRecentFolders(folders);
                    resolve();
                };
                
                request.onerror = () => {
                    console.error('加载最近文件夹失败:', request.error);
                    resolve();
                };
            });
        } catch (error) {
            console.error('加载最近文件夹失败:', error);
        }
    }
    
    // 渲染最近文件夹列表
    renderRecentFolders(folders) {
        const container = document.getElementById('recentFoldersContainer');
        if (!container) return;
        
        if (folders.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        const listEl = document.getElementById('recentFoldersList');
        listEl.innerHTML = '';
        
        folders.forEach(folder => {
            const item = document.createElement('div');
            item.className = 'recent-folder-item';
            item.innerHTML = `
                <i class="fas fa-folder"></i>
                <span class="folder-name" title="${folder.name}">${folder.name}</span>
                <button class="btn-icon-small delete-folder" data-id="${folder.id}" title="从列表中移除">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // 点击文件夹名称切换到该文件夹
            item.querySelector('.folder-name').addEventListener('click', async () => {
                await this.switchToFolder(folder.handle);
            });
            
            item.querySelector('i.fa-folder').addEventListener('click', async () => {
                await this.switchToFolder(folder.handle);
            });
            
            // 点击删除按钮从列表中移除
            item.querySelector('.delete-folder').addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.removeRecentFolder(folder.id);
            });
            
            // 高亮当前文件夹
            if (this.directoryHandle && this.directoryHandle.name === folder.name) {
                item.classList.add('active');
            }
            
            listEl.appendChild(item);
        });
    }
    
    // 切换到指定文件夹
    async switchToFolder(handle) {
        if (!handle) return;
        
        try {
            // 检查权限
            const options = { mode: 'read' };
            const permission = await handle.queryPermission(options);
            
            if (permission === 'granted' || (permission === 'prompt' && await handle.requestPermission(options) === 'granted')) {
                this.directoryHandle = handle;
                await this.saveFolderHandle(handle);
                this.showToast(`已切换到文件夹: ${handle.name}`, 'success');
                await this.loadFiles();
                await this.loadRecentFolders(); // 更新高亮状态
            } else {
                this.showToast('无法访问该文件夹，权限被拒绝', 'error');
            }
        } catch (error) {
            console.error('切换文件夹失败:', error);
            this.showToast('切换文件夹失败: ' + error.message, 'error');
        }
    }
    
    // 从最近列表中移除文件夹
    async removeRecentFolder(id) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.recentFoldersStore], 'readwrite');
            const store = transaction.objectStore(this.recentFoldersStore);
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    // 不使用await，而是用.then()
                    this.loadRecentFolders()
                        .then(() => {
                            this.showToast('已从列表中移除', 'info');
                            resolve();
                        })
                        .catch(err => {
                            console.error('重新加载文件夹列表失败:', err);
                            this.showToast('已从列表中移除', 'info');
                            resolve(); // 仍然resolve，因为删除操作已成功
                        });
                };
                
                request.onerror = () => {
                    console.error('移除文件夹失败:', request.error);
                    this.showToast('移除失败', 'error');
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('移除文件夹失败:', error);
            this.showToast('移除失败', 'error');
        }
    }
    
    // 初始化元素引用
    initElements() {
        this.sidebar = document.getElementById('sidebar');
        this.fileTree = document.getElementById('fileTree');
        this.searchInput = document.getElementById('searchInput');
        this.currentFileEl = document.getElementById('currentFile');
        this.welcomePage = document.getElementById('welcomePage');
        this.editorContainer = document.getElementById('editorContainer');
        this.previewContainer = document.getElementById('previewContainer');
        this.contentArea = document.getElementById('contentArea');
        this.editor = document.getElementById('editor');
        this.preview = document.getElementById('preview');
        this.saveBtn = document.getElementById('saveBtn');
        this.newFileModal = document.getElementById('newFileModal');
        this.newFileName = document.getElementById('newFileName');
        this.toastContainer = document.getElementById('toastContainer');
        this.encodingSelect = document.getElementById('encodingSelect');
        this.splitResizer = document.getElementById('splitResizer');
    }
    
    // 初始化 Marked 配置
    initMarked() {
        // 初始化 Mermaid（根据主题自动切换）
        if (typeof mermaid !== 'undefined') {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'loose',
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                },
                sequence: {
                    useMaxWidth: true,
                    wrap: true
                },
                gantt: {
                    useMaxWidth: true
                }
            });
        }
        
        // 配置 marked
        marked.setOptions({
            gfm: true,
            breaks: true,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: true
        });
        
        const renderer = new marked.Renderer();
        
        // 自定义代码块渲染器，处理 Mermaid
        renderer.code = (code, language) => {
            // 如果是 mermaid 代码块，直接返回 mermaid div
            if (language === 'mermaid') {
                return `<div class="mermaid">${code}</div>`;
            }
            
            // 其他代码块 - 只添加语言标记，不在这里高亮（避免双重处理）
            // 转义 HTML 内容以避免安全问题
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            
            const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
            return `<pre><code class="language-${validLanguage}">${escapedCode}</code></pre>`;
        };
        
        renderer.listitem = (text) => {
            if (text.startsWith('<input')) {
                return `<li class="task-list-item">${text}</li>`;
            }
            return `<li>${text}</li>`;
        };
        
        renderer.heading = (text, level) => {
            const slug = text.toLowerCase()
                .replace(/[\s]+/g, '-')
                .replace(/[^\w\u4e00-\u9fa5-]/g, '');
            return `<h${level} id="${slug}">${text}</h${level}>`;
        };
        
        renderer.image = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy" onclick="window.open('${href}', '_blank')">`;
        };
        
        renderer.link = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            const external = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${href}"${titleAttr}${external}>${text}</a>`;
        };
        
        marked.use({ renderer });
    }
    
    // 绑定事件
    bindEvents() {
        // 侧边栏切换
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            this.sidebar.classList.add('collapsed');
            document.getElementById('showSidebar').style.display = 'flex';
        });
        
        document.getElementById('showSidebar').addEventListener('click', () => {
            this.sidebar.classList.remove('collapsed');
            document.getElementById('showSidebar').style.display = 'none';
        });
        
        // 打开文件夹
        document.getElementById('openFolderBtn').addEventListener('click', () => {
            this.openFolder();
        });
        
        // 刷新文件列表
        document.getElementById('refreshBtn').addEventListener('click', () => {
            if (this.directoryHandle) {
                this.loadFiles();
            } else {
                this.showToast('请先打开一个文件夹', 'warning');
            }
        });
        
        // 搜索
        this.searchInput.addEventListener('input', (e) => {
            this.filterFiles(e.target.value);
        });
        
        // 视图切换
        document.getElementById('viewBtn').addEventListener('click', () => this.setViewMode('view'));
        document.getElementById('splitBtn').addEventListener('click', () => this.setViewMode('split'));
        
        // 保存
        this.saveBtn.addEventListener('click', () => this.saveFile());
        
        // 编辑器内容变化
        this.editor.addEventListener('input', () => {
            this.isModified = true;
            this.updatePreview();
        });
        
        // 编辑器点击同步到预览
        this.editor.addEventListener('click', () => {
            if (this.viewMode === 'split') {
                this.syncPreviewFromEditor();
            }
        });
        
        // 编辑器滚动同步到预览
        this.editor.addEventListener('scroll', () => {
            if (this.viewMode === 'split' && !this.isPreviewScrolling) {
                this.syncPreviewScroll();
            }
        });
        
        // 快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveFile();
                }
            }
        });
        
        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 编码选择
        if (this.encodingSelect) {
            this.encodingSelect.addEventListener('change', (e) => {
                this.manualEncoding = e.target.value;
                if (this.currentFileHandle) {
                    // 重新加载当前文件
                    const currentPath = this.currentFileEl.textContent;
                    this.loadFile(currentPath);
                }
            });
        }
        
        // 分栏调整器
        if (this.splitResizer) {
            this.splitResizer.addEventListener('mousedown', (e) => {
                this.startResize(e);
            });
        }
        
        // 预览区域点击同步到编辑器
        this.preview.addEventListener('click', (e) => {
            if (this.viewMode === 'split') {
                this.syncEditorFromPreview(e);
            }
        });
        
        // 预览区域滚动同步到编辑器
        this.previewContainer.addEventListener('scroll', () => {
            if (this.viewMode === 'split' && !this.isEditorScrolling) {
                this.syncEditorScroll();
            }
        });
        
        // 全局鼠标事件（用于拖动）
        document.addEventListener('mousemove', (e) => {
            if (this.isResizing) {
                this.resize(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.stopResize();
            }
        });
    }
    
    // 开始调整分栏大小
    startResize(e) {
        this.isResizing = true;
        this.contentArea.classList.add('resizing');
        this.splitResizer.classList.add('dragging');
        e.preventDefault();
    }
    
    // 调整分栏大小
    resize(e) {
        if (!this.isResizing) return;
        
        const rect = this.contentArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        
        // 限制在 20% - 80% 之间
        this.splitRatio = Math.max(20, Math.min(80, percentage));
        
        this.editorContainer.style.flex = `0 0 ${this.splitRatio}%`;
        this.editorContainer.style.maxWidth = `${this.splitRatio}%`;
        this.previewContainer.style.flex = `0 0 ${100 - this.splitRatio}%`;
        this.previewContainer.style.maxWidth = `${100 - this.splitRatio}%`;
        this.splitResizer.style.left = `${this.splitRatio}%`;
    }
    
    // 停止调整分栏大小
    stopResize() {
        this.isResizing = false;
        this.contentArea.classList.remove('resizing');
        this.splitResizer.classList.remove('dragging');
        
        // 保存分栏比例
        localStorage.setItem('md-viewer-split-ratio', this.splitRatio);
    }
    
    // 打开文件夹
    async openFolder() {
        try {
            this.directoryHandle = await window.showDirectoryPicker();
            // 保存文件夹句柄
            await this.saveFolderHandle(this.directoryHandle);
            // 添加到最近文件夹列表
            await this.addToRecentFolders(this.directoryHandle);
            this.showToast('文件夹已打开: ' + this.directoryHandle.name, 'success');
            await this.loadFiles();
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showToast('打开文件夹失败: ' + error.message, 'error');
            }
        }
    }
    
    // 加载文件列表
    async loadFiles() {
        if (!this.directoryHandle) {
            this.showToast('请先打开一个文件夹', 'warning');
            return;
        }
        
        this.fileTree.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 扫描文件...</div>';
        this.fileHandles.clear();
        
        try {
            const files = await this.scanDirectory(this.directoryHandle);
            this.renderFileTree(files);
        } catch (error) {
            this.showToast('扫描文件失败: ' + error.message, 'error');
            this.fileTree.innerHTML = `
                <div class="empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>扫描失败</p>
                </div>
            `;
        }
    }
    
    // 递归扫描目录
    async scanDirectory(dirHandle, relativePath = '') {
        const items = [];
        
        try {
            for await (const entry of dirHandle.values()) {
                const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                
                if (entry.kind === 'directory') {
                    const children = await this.scanDirectory(entry, entryPath);
                    if (children.length > 0) {
                        items.push({
                            name: entry.name,
                            type: 'folder',
                            path: entryPath,
                            children: children,
                            handle: entry
                        });
                    }
                } else if (entry.kind === 'file' && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
                    items.push({
                        name: entry.name,
                        type: 'file',
                        path: entryPath,
                        handle: entry
                    });
                    this.fileHandles.set(entryPath, entry);
                }
            }
        } catch (error) {
            console.error('扫描目录错误:', error);
        }
        
        // 排序
        items.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, 'zh-CN');
        });
        
        return items;
    }
    
    // 渲染文件树
    renderFileTree(files, container = null) {
        if (!container) {
            this.fileTree.innerHTML = '';
            container = this.fileTree;
        }
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty">
                    <i class="fas fa-folder-open"></i>
                    <p>没有找到 Markdown 文件</p>
                </div>
            `;
            return;
        }
        
        files.forEach(item => {
            const div = document.createElement('div');
            div.className = 'tree-item';
            div.dataset.path = item.path;
            div.dataset.type = item.type;
            
            if (item.type === 'folder') {
                div.innerHTML = `
                    <div class="tree-item-content">
                        <i class="fas fa-chevron-right chevron"></i>
                        <i class="fas fa-folder folder-icon"></i>
                        <span>${item.name}</span>
                    </div>
                    <div class="tree-children"></div>
                `;
                
                const content = div.querySelector('.tree-item-content');
                const children = div.querySelector('.tree-children');
                const chevron = div.querySelector('.chevron');
                
                content.addEventListener('click', () => {
                    children.classList.toggle('open');
                    chevron.classList.toggle('open');
                });
                
                if (item.children && item.children.length > 0) {
                    this.renderFileTree(item.children, children);
                }
            } else {
                div.innerHTML = `
                    <div class="tree-item-content">
                        <i class="fas fa-file-alt file-icon"></i>
                        <span>${item.name}</span>
                    </div>
                `;
                
                div.querySelector('.tree-item-content').addEventListener('click', () => {
                    this.loadFile(item.path);
                });
            }
            
            container.appendChild(div);
        });
    }
    
    // 过滤文件
    filterFiles(keyword) {
        const items = this.fileTree.querySelectorAll('.tree-item');
        const lowerKeyword = keyword.toLowerCase();
        
        items.forEach(item => {
            const name = item.dataset.path.toLowerCase();
            if (name.includes(lowerKeyword)) {
                item.style.display = '';
                let parent = item.parentElement;
                while (parent && parent.classList.contains('tree-children')) {
                    parent.classList.add('open');
                    const chevron = parent.previousElementSibling && parent.previousElementSibling.querySelector('.chevron');
                    if (chevron) chevron.classList.add('open');
                    parent = parent.parentElement && parent.parentElement.parentElement;
                }
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // 检测文件编码
    async detectEncoding(buffer) {
        const arr = new Uint8Array(buffer.slice(0, 3));
        
        // 检测 UTF-8 BOM
        if (arr[0] === 0xEF && arr[1] === 0xBB && arr[2] === 0xBF) {
            return 'utf-8';
        }
        
        // 检测 UTF-16 LE BOM
        if (arr[0] === 0xFF && arr[1] === 0xFE) {
            return 'utf-16le';
        }
        
        // 检测 UTF-16 BE BOM
        if (arr[0] === 0xFE && arr[1] === 0xFF) {
            return 'utf-16be';
        }
        
        // 尝试检测 GBK (简单启发式检测)
        const testArr = new Uint8Array(buffer.slice(0, Math.min(1000, buffer.byteLength)));
        let hasHighByte = false;
        
        for (let i = 0; i < testArr.length; i++) {
            if (testArr[i] > 127) {
                hasHighByte = true;
                break;
            }
        }
        
        // 如果有高位字节，尝试作为 UTF-8 解码
        if (hasHighByte) {
            try {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                decoder.decode(testArr);
                return 'utf-8';
            } catch (e) {
                // UTF-8 解码失败，可能是 GBK
                return 'gbk';
            }
        }
        
        // 默认 UTF-8
        return 'utf-8';
    }
    
    // 解码文件内容
    async decodeFileContent(file) {
        const buffer = await file.arrayBuffer();
        
        // 如果用户手动选择了编码
        if (this.manualEncoding && this.manualEncoding !== 'auto') {
            try {
                const decoder = new TextDecoder(this.manualEncoding);
                return decoder.decode(buffer);
            } catch (error) {
                this.showToast(`使用 ${this.manualEncoding.toUpperCase()} 解码失败，尝试自动检测`, 'warning');
            }
        }
        
        // 自动检测编码
        const encoding = await this.detectEncoding(buffer);
        
        try {
            const decoder = new TextDecoder(encoding);
            const content = decoder.decode(buffer);
            if (encoding !== 'utf-8') {
                this.showToast(`文件使用 ${encoding.toUpperCase()} 编码`, 'info');
            }
            return content;
        } catch (error) {
            // 如果解码失败，尝试其他编码
            console.warn(`使用 ${encoding} 解码失败，尝试其他编码`);
            
            const encodings = ['utf-8', 'gbk', 'gb2312', 'gb18030', 'big5'];
            for (const enc of encodings) {
                if (enc === encoding) continue;
                try {
                    const decoder = new TextDecoder(enc);
                    const content = decoder.decode(buffer);
                    this.showToast(`文件使用 ${enc.toUpperCase()} 编码打开`, 'info');
                    return content;
                } catch (e) {
                    continue;
                }
            }
            
            // 最后尝试忽略错误
            const decoder = new TextDecoder('utf-8', { fatal: false });
            this.showToast('无法正确识别编码，可能显示乱码', 'warning');
            return decoder.decode(buffer);
        }
    }
    
    // 加载文件
    async loadFile(filePath) {
        if (this.isModified) {
            if (!confirm('当前文件有未保存的修改，是否继续？')) {
                return;
            }
        }
        
        try {
            const fileHandle = this.fileHandles.get(filePath);
            if (!fileHandle) {
                this.showToast('文件句柄未找到', 'error');
                return;
            }
            
            const file = await fileHandle.getFile();
            const content = await this.decodeFileContent(file);
            
            this.currentFileHandle = fileHandle;
            this.currentContent = content;
            this.isModified = false;
            
            this.currentFileEl.textContent = filePath;
            this.editor.value = content;
            this.updatePreview();
            
            // 更新文件树选中状态
            this.fileTree.querySelectorAll('.tree-item-content').forEach(el => {
                el.classList.remove('active');
            });
            const activeItem = this.fileTree.querySelector(`[data-path="${filePath}"] .tree-item-content`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
            
            this.welcomePage.style.display = 'none';
            this.setViewMode(this.viewMode);
            
            this.showToast('文件已打开', 'success');
        } catch (error) {
            this.showToast('打开文件失败: ' + error.message, 'error');
        }
    }
    
    // 保存文件
    async saveFile() {
        if (!this.currentFileHandle) {
            this.showToast('没有打开的文件', 'warning');
            return;
        }
        
        try {
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(this.editor.value);
            await writable.close();
            
            this.currentContent = this.editor.value;
            this.isModified = false;
            this.showToast('保存成功', 'success');
        } catch (error) {
            this.showToast('保存失败: ' + error.message, 'error');
        }
    }
    
    // 设置视图模式
    setViewMode(mode) {
        this.viewMode = mode;
        
        // 更新按钮状态
        document.querySelectorAll('.view-toggle .btn-toggle').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (mode === 'view') {
            document.getElementById('viewBtn').classList.add('active');
            this.editorContainer.style.display = 'none';
            this.previewContainer.style.display = 'flex';
            this.saveBtn.style.display = 'none';
            this.splitResizer.style.display = 'none';
            this.contentArea.classList.remove('split-mode');
        } else if (mode === 'split') {
            document.getElementById('splitBtn').classList.add('active');
            this.editorContainer.style.display = 'flex';
            this.previewContainer.style.display = 'flex';
            this.saveBtn.style.display = 'flex';
            this.splitResizer.style.display = 'block';
            this.contentArea.classList.add('split-mode');
            
            // 恢复保存的分栏比例
            const savedRatio = localStorage.getItem('md-viewer-split-ratio');
            if (savedRatio) {
                this.splitRatio = parseFloat(savedRatio);
            }
            
            // 应用分栏比例
            this.editorContainer.style.flex = `0 0 ${this.splitRatio}%`;
            this.editorContainer.style.maxWidth = `${this.splitRatio}%`;
            this.previewContainer.style.flex = `0 0 ${100 - this.splitRatio}%`;
            this.previewContainer.style.maxWidth = `${100 - this.splitRatio}%`;
            this.splitResizer.style.left = `${this.splitRatio}%`;
        }
    }
    
    // 更新预览
    updatePreview() {
        const content = this.editor.value;
        this.preview.innerHTML = marked.parse(content);
        
        // 重新高亮代码块（安全方式）
        this.preview.querySelectorAll('pre code:not(.mermaid)').forEach((block) => {
            // 移除之前的高亮
            delete block.dataset.highlighted;
            // 安全地高亮代码块
            try {
                hljs.highlightElement(block);
            } catch (error) {
                console.warn('[Preview] 代码高亮失败:', error);
            }
        });
        
        // 渲染 Mermaid 图表
        if (typeof mermaid !== 'undefined') {
            const mermaidElements = this.preview.querySelectorAll('.mermaid');
            console.log(`[Preview] 找到 ${mermaidElements.length} 个 Mermaid 元素待渲染`);
            
            if (mermaidElements.length > 0) {
                mermaidElements.forEach((element, index) => {
                    element.id = `mermaid-${Date.now()}-${index}`;
                });
                
                console.log('[Preview] 开始渲染 Mermaid 图表...');
                mermaid.run({
                    nodes: mermaidElements
                }).then(() => {
                    console.log('[Preview] Mermaid 渲染完成，准备绑定事件');
                    // Mermaid 渲染完成后，等待一小段时间确保 DOM 更新完成
                    setTimeout(() => {
                        this.attachDiagramZoomHandlers();
                        console.log('[Preview] 事件绑定延迟执行完成');
                    }, 100);
                }).catch(err => {
                    console.error('[Preview] Mermaid 渲染错误:', err);
                    
                    // 在失败的图表位置显示友好的错误信息
                    mermaidElements.forEach(element => {
                        if (element.querySelector('svg')) return; // 已经成功渲染的跳过
                        
                        const errorMsg = err.message || err.str || '未知错误';
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'mermaid-error';
                        errorDiv.innerHTML = `
                            <div class="mermaid-error-content">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h4>Mermaid 图表渲染失败</h4>
                                <p>${errorMsg}</p>
                                <details>
                                    <summary>查看原始代码</summary>
                                    <pre><code>${element.textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                                </details>
                                <p class="hint">💡 提示：检查图表语法是否正确，特别注意特殊字符需要转义</p>
                            </div>
                        `;
                        element.replaceWith(errorDiv);
                    });
                });
            }
        } else {
            console.warn('[Preview] Mermaid 未定义！');
        }
        
        // 渲染数学公式
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(this.preview, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
        
        // 处理 Markdown 链接点击（相对路径跳转）
        this.handleMarkdownLinks();
    }
    
    // 处理 Markdown 链接点击
    handleMarkdownLinks() {
        const links = this.preview.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // 只处理相对路径的 .md 文件链接
            if (href && href.endsWith('.md') && !href.startsWith('http') && !href.startsWith('//')) {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    
                    try {
                        // 获取当前文件的路径
                        const currentFilePath = this.currentFileEl.textContent;
                        
                        // 计算目标文件的路径（相对于当前文件）
                        const targetPath = this.resolveRelativePath(currentFilePath, href);
                        
                        console.log(`[Link] 当前文件: ${currentFilePath}`);
                        console.log(`[Link] 链接href: ${href}`);
                        console.log(`[Link] 目标路径: ${targetPath}`);
                        
                        // 检查目标文件是否存在
                        if (this.fileHandles.has(targetPath)) {
                            await this.loadFile(targetPath);
                        } else {
                            this.showToast(`文件不存在: ${targetPath}`, 'error');
                        }
                    } catch (error) {
                        console.error('[Link] 跳转失败:', error);
                        this.showToast('文件跳转失败: ' + error.message, 'error');
                    }
                });
                
                // 添加视觉提示
                link.style.cursor = 'pointer';
                link.title = `跳转到: ${href}`;
            }
        });
    }
    
    // 解析相对路径
    resolveRelativePath(currentPath, relativePath) {
        // 移除开头的 ./
        relativePath = relativePath.replace(/^\.\//g, '');
        
        // 获取当前文件所在目录
        const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
        
        // 处理 ../ 的情况
        let targetPath = relativePath;
        let baseDir = currentDir;
        
        while (targetPath.startsWith('../')) {
            targetPath = targetPath.substring(3);
            // 向上一级目录
            const lastSlash = baseDir.lastIndexOf('/');
            if (lastSlash > 0) {
                baseDir = baseDir.substring(0, lastSlash);
            } else {
                baseDir = '';
            }
        }
        
        // 组合最终路径
        if (baseDir) {
            return `${baseDir}/${targetPath}`;
        } else {
            return targetPath;
        }
    }
    
    // 主题切换
    toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('md-viewer-theme', newTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        // 重新初始化 Mermaid 以应用新主题
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: newTheme === 'dark' ? 'dark' : 'default',
                securityLevel: 'loose',
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                },
                sequence: {
                    useMaxWidth: true,
                    wrap: true
                },
                gantt: {
                    useMaxWidth: true
                }
            });
            // 如果当前有打开的文件，重新渲染
            if (this.currentFileHandle) {
                this.updatePreview();
            }
        }
    }
    
    // 加载主题
    loadTheme() {
        const savedTheme = localStorage.getItem('md-viewer-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // 显示 Toast
    showToast(message, type = 'info') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // 初始化图表缩放功能
    initDiagramZoom() {
        console.log('[Zoom] 初始化缩放功能...');
        
        this.zoomModal = document.getElementById('diagramZoomModal');
        this.zoomContent = document.getElementById('zoomContent');
        this.zoomClose = document.getElementById('zoomClose');
        this.zoomIn = document.getElementById('zoomIn');
        this.zoomOut = document.getElementById('zoomOut');
        this.zoomReset = document.getElementById('zoomReset');
        this.zoomLevel = document.getElementById('zoomLevel');
        
        // 检查元素是否存在
        if (!this.zoomModal) console.error('[Zoom] 错误: diagramZoomModal 元素未找到!');
        if (!this.zoomContent) console.error('[Zoom] 错误: zoomContent 元素未找到!');
        if (!this.zoomClose) console.error('[Zoom] 错误: zoomClose 元素未找到!');
        if (!this.zoomIn) console.error('[Zoom] 错误: zoomIn 元素未找到!');
        if (!this.zoomOut) console.error('[Zoom] 错误: zoomOut 元素未找到!');
        if (!this.zoomReset) console.error('[Zoom] 错误: zoomReset 元素未找到!');
        if (!this.zoomLevel) console.error('[Zoom] 错误: zoomLevel 元素未找到!');
        
        this.currentZoomScale = 1;
        this.currentDiagram = null;
        
        // 拖动相关状态
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.translateX = 0;
        this.translateY = 0;
        
        // 关闭按钮
        if (this.zoomClose) {
            this.zoomClose.addEventListener('click', () => this.closeDiagramZoom());
        }
        
        // 点击背景关闭
        if (this.zoomModal) {
            this.zoomModal.addEventListener('click', (e) => {
                if (e.target === this.zoomModal) {
                    this.closeDiagramZoom();
                }
            });
        }
        
        // 缩放控制
        if (this.zoomIn) {
            this.zoomIn.addEventListener('click', () => this.adjustZoom(0.2));
        }
        if (this.zoomOut) {
            this.zoomOut.addEventListener('click', () => this.adjustZoom(-0.2));
        }
        if (this.zoomReset) {
            this.zoomReset.addEventListener('click', () => this.resetZoom());
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (!this.zoomModal || !this.zoomModal.classList.contains('show')) return;
            
            if (e.key === 'Escape') {
                this.closeDiagramZoom();
            } else if (e.key === '+' || e.key === '=') {
                this.adjustZoom(0.2);
            } else if (e.key === '-') {
                this.adjustZoom(-0.2);
            } else if (e.key === '0') {
                this.resetZoom();
            }
        });
        
        // 鼠标滚轮缩放
        if (this.zoomContent) {
            this.zoomContent.addEventListener('wheel', (e) => {
                if (!this.zoomModal || !this.zoomModal.classList.contains('show')) return;
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.adjustZoom(delta);
            });
            
            // 拖动功能
            this.zoomContent.addEventListener('mousedown', (e) => {
                if (!this.zoomModal || !this.zoomModal.classList.contains('show')) return;
                if (e.button !== 0) return; // 只响应左键
                
                this.isDragging = true;
                this.dragStartX = e.clientX - this.translateX;
                this.dragStartY = e.clientY - this.translateY;
                this.zoomContent.style.cursor = 'grabbing';
                e.preventDefault();
                console.log('[Zoom] 开始拖动');
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                
                this.translateX = e.clientX - this.dragStartX;
                this.translateY = e.clientY - this.dragStartY;
                this.updateZoomTransform();
            });
            
            document.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.zoomContent.style.cursor = 'grab';
                    console.log('[Zoom] 停止拖动');
                }
            });
        }
        
        console.log('[Zoom] 缩放功能初始化完成');
    }
    
    // 打开图表缩放
    openDiagramZoom(diagramElement) {
        console.log('[Zoom] 打开缩放模态框');
        console.log('[Zoom] 图表元素:', diagramElement);
        
        // 克隆图表内容
        const clone = diagramElement.cloneNode(true);
        clone.style.cursor = 'default';
        clone.style.maxWidth = 'none';
        clone.style.maxHeight = 'none';
        clone.style.margin = '0';
        clone.classList.add('zoom-diagram');
        
        this.zoomContent.innerHTML = '';
        this.zoomContent.appendChild(clone);
        this.currentDiagram = clone;
        
        // 重置拖动状态
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.zoomContent.style.cursor = 'grab';
        
        // 显示模态框
        this.zoomModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // 延迟后智能设置初始缩放
        setTimeout(() => {
            this.smartResetZoom();
        }, 100);
        
        console.log('[Zoom] 模态框已显示');
    }
    
    // 智能重置缩放 - 自动适配最佳大小
    smartResetZoom() {
        if (!this.currentDiagram) return;
        
        const svg = this.currentDiagram.querySelector('svg');
        if (!svg) {
            // 如果没有 SVG，使用默认缩放
            this.currentZoomScale = 1;
            this.updateZoomTransform();
            return;
        }
        
        // 获取容器尺寸
        const containerWidth = this.zoomContent.clientWidth;
        const containerHeight = this.zoomContent.clientHeight;
        
        // 获取 SVG 尺寸
        let svgWidth, svgHeight;
        try {
            const bbox = svg.getBBox();
            svgWidth = bbox.width;
            svgHeight = bbox.height;
        } catch (e) {
            // 如果 getBBox 失败，使用 clientWidth/Height
            svgWidth = svg.clientWidth || svg.width.baseVal.value;
            svgHeight = svg.clientHeight || svg.height.baseVal.value;
        }
        
        if (!svgWidth || !svgHeight) {
            this.currentZoomScale = 1;
            this.updateZoomTransform();
            return;
        }
        
        // 计算最佳缩放比例（留 10% 边距）
        const scaleX = (containerWidth * 0.9) / svgWidth;
        const scaleY = (containerHeight * 0.9) / svgHeight;
        const optimalScale = Math.min(scaleX, scaleY, 1.5); // 最大 150%
        
        // 设置缩放（最小 80%，最大 150%）
        this.currentZoomScale = Math.max(0.8, Math.min(1.5, optimalScale));
        this.updateZoomTransform();
        
        console.log(`[Zoom] 智能缩放到 ${Math.round(this.currentZoomScale * 100)}%`);
    }
    
    // 关闭图表缩放
    closeDiagramZoom() {
        this.zoomModal.classList.remove('show');
        document.body.style.overflow = '';
        this.isDragging = false;
        this.translateX = 0;
        this.translateY = 0;
        setTimeout(() => {
            this.zoomContent.innerHTML = '';
            this.currentDiagram = null;
        }, 300);
    }
    
    // 调整缩放
    adjustZoom(delta) {
        this.currentZoomScale = Math.max(0.5, Math.min(5, this.currentZoomScale + delta));
        this.updateZoomTransform();
    }
    
    // 重置缩放
    resetZoom() {
        // 使用智能重置
        this.smartResetZoom();
    }
    
    // 更新缩放变换
    updateZoomTransform() {
        if (this.currentDiagram) {
            this.currentDiagram.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentZoomScale})`;
            this.currentDiagram.style.transformOrigin = 'center center';
            this.zoomLevel.textContent = `${Math.round(this.currentZoomScale * 100)}%`;
        }
    }
    
    // 为图表添加双击事件
    attachDiagramZoomHandlers() {
        const diagrams = this.preview.querySelectorAll('.mermaid');
        console.log(`[Zoom] 找到 ${diagrams.length} 个 Mermaid 图表`);
        
        if (diagrams.length === 0) {
            console.warn('[Zoom] 警告：没有找到 .mermaid 元素！');
            return;
        }
        
        diagrams.forEach((diagram, index) => {
            // 只处理有 SVG 的图表（渲染成功的）
            if (!diagram.querySelector('svg')) {
                console.warn(`[Zoom] 图表 ${index} 没有 SVG，跳过`);
                return;
            }
            
            // 检查是否已经绑定过
            if (diagram._zoomHandlerBound) {
                console.log(`[Zoom] 图表 ${index} 已经绑定过，跳过`);
                return;
            }
            
            // 设置样式
            diagram.style.cursor = 'zoom-in';
            diagram.style.userSelect = 'none';
            diagram.title = '双击放大查看 (可拖动/滚轮缩放)';
            
            // 使用 ondblclick 而不是 addEventListener（更可靠）
            const self = this;
            diagram.ondblclick = function(e) {
                console.log(`[Zoom] ✓✓✓ 图表 ${index} 被双击`);
                e.preventDefault();
                e.stopPropagation();
                self.openDiagramZoom(this);
            };
            
            // 标记已绑定
            diagram._zoomHandlerBound = true;
            
            console.log(`[Zoom] ✓ 已为图表 ${index} 绑定双击事件 (ondblclick)`);
        });
        
        console.log(`[Zoom] ✅ 成功绑定 ${diagrams.length} 个图表的事件`);
    }
    
    // ==================== 编辑器与预览同步功能 ====================
    
    // 从编辑器同步到预览（点击）
    syncPreviewFromEditor() {
        const cursorPosition = this.editor.selectionStart;
        const textBeforeCursor = this.editor.value.substring(0, cursorPosition);
        const currentLine = textBeforeCursor.split('\n').length;
        
        // 计算当前行在整个文档中的比例
        const totalLines = this.editor.value.split('\n').length;
        const ratio = currentLine / totalLines;
        
        // 滚动预览到相应位置
        const maxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;
        const targetScroll = maxScroll * ratio;
        
        this.isEditorScrolling = true;
        this.previewContainer.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            this.isEditorScrolling = false;
        }, 100);
        
        console.log(`[Sync] 编辑器第 ${currentLine}/${totalLines} 行 → 预览滚动到 ${Math.round(ratio * 100)}%`);
    }
    
    // 从编辑器滚动同步到预览
    syncPreviewScroll() {
        clearTimeout(this.syncScrollTimeout);
        this.syncScrollTimeout = setTimeout(() => {
            const editorScrollRatio = this.editor.scrollTop / (this.editor.scrollHeight - this.editor.clientHeight);
            const previewMaxScroll = this.previewContainer.scrollHeight - this.previewContainer.clientHeight;
            
            this.isEditorScrolling = true;
            this.previewContainer.scrollTop = previewMaxScroll * editorScrollRatio;
            
            setTimeout(() => {
                this.isEditorScrolling = false;
            }, 50);
        }, 50);
    }
    
    // 从预览同步到编辑器（点击）
    syncEditorFromPreview(event) {
        // 获取点击的元素
        let target = event.target;
        
        // 向上查找直到找到有 id 的标题元素
        while (target && target !== this.preview) {
            if (target.id && target.tagName.match(/^H[1-6]$/)) {
                // 找到标题，在编辑器中查找对应的行
                const headingText = target.textContent;
                const editorText = this.editor.value;
                const lines = editorText.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.match(/^#{1,6}\s/) && line.includes(headingText.trim())) {
                        // 找到对应的行，滚动编辑器
                        this.scrollEditorToLine(i);
                        console.log(`[Sync] 预览标题 "${headingText}" → 编辑器第 ${i + 1} 行`);
                        return;
                    }
                }
            }
            target = target.parentElement;
        }
        
        // 如果没有找到标题，使用滚动比例同步
        const previewScrollRatio = this.previewContainer.scrollTop / (this.previewContainer.scrollHeight - this.previewContainer.clientHeight);
        const editorMaxScroll = this.editor.scrollHeight - this.editor.clientHeight;
        
        this.isPreviewScrolling = true;
        this.editor.scrollTop = editorMaxScroll * previewScrollRatio;
        
        setTimeout(() => {
            this.isPreviewScrolling = false;
        }, 50);
    }
    
    // 从预览滚动同步到编辑器
    syncEditorScroll() {
        clearTimeout(this.syncScrollTimeout);
        this.syncScrollTimeout = setTimeout(() => {
            const previewScrollRatio = this.previewContainer.scrollTop / (this.previewContainer.scrollHeight - this.previewContainer.clientHeight);
            const editorMaxScroll = this.editor.scrollHeight - this.editor.clientHeight;
            
            this.isPreviewScrolling = true;
            this.editor.scrollTop = editorMaxScroll * previewScrollRatio;
            
            setTimeout(() => {
                this.isPreviewScrolling = false;
            }, 50);
        }, 50);
    }
    
    // 滚动编辑器到指定行
    scrollEditorToLine(lineNumber) {
        const lines = this.editor.value.split('\n');
        let charCount = 0;
        
        for (let i = 0; i < lineNumber && i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
        }
        
        // 设置光标位置
        this.editor.setSelectionRange(charCount, charCount);
        this.editor.focus();
        
        // 计算行的位置并滚动
        const lineHeight = parseInt(window.getComputedStyle(this.editor).lineHeight);
        const scrollTop = lineNumber * lineHeight - this.editor.clientHeight / 3;
        
        this.isPreviewScrolling = true;
        this.editor.scrollTop = Math.max(0, scrollTop);
        
        setTimeout(() => {
            this.isPreviewScrolling = false;
        }, 100);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.mdViewer = new MDViewerStandalone();
});
