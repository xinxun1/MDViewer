// MD Viewer 主应用
class MDViewer {
    constructor() {
        this.currentFile = null;
        this.currentContent = '';
        this.isModified = false;
        this.viewMode = 'view'; // view, edit, split
        
        this.initElements();
        this.initMarked();
        this.bindEvents();
        this.loadTheme();
        this.loadFiles();
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
    }
    
    // 初始化 Marked 配置
    initMarked() {
        // 配置 marked
        marked.setOptions({
            gfm: true,
            breaks: true,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            highlight: (code, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (e) {
                        console.error(e);
                    }
                }
                return hljs.highlightAuto(code).value;
            }
        });
        
        // 自定义渲染器
        const renderer = new marked.Renderer();
        
        // 任务列表支持
        renderer.listitem = (text) => {
            if (text.startsWith('<input')) {
                return `<li class="task-list-item">${text}</li>`;
            }
            return `<li>${text}</li>`;
        };
        
        // 为标题添加锚点
        renderer.heading = (text, level) => {
            const slug = text.toLowerCase()
                .replace(/[\s]+/g, '-')
                .replace(/[^\w\u4e00-\u9fa5-]/g, '');
            return `<h${level} id="${slug}">${text}</h${level}>`;
        };
        
        // 图片添加点击放大
        renderer.image = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy" onclick="window.open('${href}', '_blank')">`;
        };
        
        // 链接在新窗口打开
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
        
        // 刷新文件列表
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadFiles();
        });
        
        // 搜索
        this.searchInput.addEventListener('input', (e) => {
            this.filterFiles(e.target.value);
        });
        
        // 视图切换
        document.getElementById('viewBtn').addEventListener('click', () => this.setViewMode('view'));
        document.getElementById('editBtn').addEventListener('click', () => this.setViewMode('edit'));
        document.getElementById('splitBtn').addEventListener('click', () => this.setViewMode('split'));
        
        // 保存
        this.saveBtn.addEventListener('click', () => this.saveFile());
        
        // 编辑器内容变化
        this.editor.addEventListener('input', () => {
            this.isModified = true;
            this.updatePreview();
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
        
        // 新建文件
        document.getElementById('newFileBtn').addEventListener('click', () => {
            this.newFileModal.classList.add('show');
            this.newFileName.value = '';
            this.newFileName.focus();
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            this.newFileModal.classList.remove('show');
        });
        
        document.getElementById('cancelNewFile').addEventListener('click', () => {
            this.newFileModal.classList.remove('show');
        });
        
        document.getElementById('confirmNewFile').addEventListener('click', () => {
            this.createNewFile();
        });
        
        this.newFileName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createNewFile();
            }
        });
        
        // 点击弹窗背景关闭
        this.newFileModal.addEventListener('click', (e) => {
            if (e.target === this.newFileModal) {
                this.newFileModal.classList.remove('show');
            }
        });
    }
    
    // 加载文件列表
    async loadFiles() {
        this.fileTree.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
        
        try {
            const response = await fetch('/api/files');
            const data = await response.json();
            
            if (data.success) {
                this.renderFileTree(data.files);
            } else {
                this.showToast('加载文件列表失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('网络错误: ' + error.message, 'error');
        }
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
                    <p>点击"新建文档"创建第一个文件</p>
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
                // 展开父文件夹
                let parent = item.parentElement;
                while (parent && parent.classList.contains('tree-children')) {
                    parent.classList.add('open');
                    const chevron = parent.previousElementSibling?.querySelector('.chevron');
                    if (chevron) chevron.classList.add('open');
                    parent = parent.parentElement?.parentElement;
                }
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // 加载文件内容
    async loadFile(filePath) {
        // 检查是否有未保存的修改
        if (this.isModified) {
            if (!confirm('当前文件有未保存的修改，是否继续？')) {
                return;
            }
        }
        
        try {
            const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentFile = filePath;
                this.currentContent = data.content;
                this.isModified = false;
                
                // 更新 UI
                this.currentFileEl.textContent = filePath;
                this.editor.value = data.content;
                this.updatePreview();
                
                // 更新文件树选中状态
                this.fileTree.querySelectorAll('.tree-item-content').forEach(el => {
                    el.classList.remove('active');
                });
                const activeItem = this.fileTree.querySelector(`[data-path="${filePath}"] .tree-item-content`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }
                
                // 显示内容区域
                this.welcomePage.style.display = 'none';
                this.setViewMode(this.viewMode);
                
                this.showToast('文件加载成功', 'success');
            } else {
                this.showToast('加载文件失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('网络错误: ' + error.message, 'error');
        }
    }
    
    // 保存文件
    async saveFile() {
        if (!this.currentFile) {
            this.showToast('没有打开的文件', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: this.currentFile,
                    content: this.editor.value
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentContent = this.editor.value;
                this.isModified = false;
                this.showToast('保存成功', 'success');
            } else {
                this.showToast('保存失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('网络错误: ' + error.message, 'error');
        }
    }
    
    // 创建新文件
    async createNewFile() {
        const fileName = this.newFileName.value.trim();
        if (!fileName) {
            this.showToast('请输入文件名', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/file/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: fileName
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.newFileModal.classList.remove('show');
                this.showToast('文件创建成功', 'success');
                await this.loadFiles();
                await this.loadFile(data.path);
            } else {
                this.showToast('创建失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showToast('网络错误: ' + error.message, 'error');
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
            this.contentArea.classList.remove('split-mode');
        } else if (mode === 'edit') {
            document.getElementById('editBtn').classList.add('active');
            this.editorContainer.style.display = 'flex';
            this.previewContainer.style.display = 'none';
            this.saveBtn.style.display = 'flex';
            this.contentArea.classList.remove('split-mode');
        } else if (mode === 'split') {
            document.getElementById('splitBtn').classList.add('active');
            this.editorContainer.style.display = 'flex';
            this.previewContainer.style.display = 'flex';
            this.saveBtn.style.display = 'flex';
            this.contentArea.classList.add('split-mode');
        }
    }
    
    // 更新预览
    updatePreview() {
        const content = this.editor.value;
        this.preview.innerHTML = marked.parse(content);
        
        // 重新高亮代码块
        this.preview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
    
    // 主题切换
    toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('md-viewer-theme', newTheme);
        
        // 更新图标
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // 加载主题
    loadTheme() {
        const savedTheme = localStorage.getItem('md-viewer-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // 显示 Toast 提示
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
        
        // 3秒后自动消失
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.mdViewer = new MDViewer();
});
