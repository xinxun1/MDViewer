# 🔧 双击缩放功能调试指南

## 问题：双击 UML 图无法打开缩放视图

---

## 📋 调试步骤

### 步骤 1: 强制刷新页面

**重要！** 先清除缓存：

1. 按 `Ctrl + Shift + Delete` 打开清除浏览器数据
2. 选择"缓存的图片和文件"
3. 点击"清除数据"
4. 或者直接按 `Ctrl + F5` 强制刷新

---

### 步骤 2: 打开浏览器控制台

1. 按 `F12` 打开开发者工具
2. 切换到 `Console`（控制台）标签页
3. **保持控制台打开**，继续下面的操作

---

### 步骤 3: 打开 UML 文档

1. 在 standalone.html 中打开你的文件夹
2. 选择 `03_UML_Diagrams.md` 或任何包含 Mermaid 图表的文件
3. 等待文件加载完成

---

### 步骤 4: 查看控制台日志

**在控制台中，你应该看到以下日志**：

```
[Zoom] 初始化缩放功能...
[Zoom] 缩放功能初始化完成
[Preview] 找到 X 个 Mermaid 元素待渲染
[Preview] 开始渲染 Mermaid 图表...
[Preview] Mermaid 渲染完成，准备绑定事件
[Zoom] 找到 X 个 Mermaid 图表
[Zoom] 已为图表 0 绑定双击事件
[Zoom] 已为图表 1 绑定双击事件
...
```

---

### 步骤 5: 检查是否有错误

#### ✅ 正常情况

如果看到上述日志，且**没有红色错误**，说明初始化成功。

#### ❌ 异常情况 1: 元素未找到错误

```
[Zoom] 错误: diagramZoomModal 元素未找到!
[Zoom] 错误: zoomContent 元素未找到!
```

**解决方法**：
- 检查 `standalone.html` 是否包含缩放模态框结构
- 在 HTML 文件中搜索 `id="diagramZoomModal"`
- 如果不存在，说明 HTML 没有更新

#### ❌ 异常情况 2: Mermaid 未定义

```
[Preview] Mermaid 未定义！
```

**解决方法**：
- 检查 Mermaid CDN 是否加载成功
- 检查网络连接
- 查看 Network 标签页，确认 mermaid.min.js 加载成功（状态 200）

#### ❌ 异常情况 3: 没有找到图表

```
[Zoom] 警告：没有找到 .mermaid 元素！
```

**解决方法**：
- Mermaid 代码块可能未被正确识别
- 检查 Markdown 文件中的代码块是否使用 \`\`\`mermaid
- 查看渲染后的 HTML，确认是否为 `<div class="mermaid">` 而不是 `<pre><code>`

---

### 步骤 6: 双击测试

1. 在预览区域找到一个 UML 图表
2. **鼠标悬停**在图表上：
   - 应该看到鼠标变成 🔍（放大镜）
   - 图表应该有轻微阴影效果
   - 工具提示应显示"双击放大查看"
3. **双击**图表

**预期结果**：
```
控制台输出：
[Zoom] 图表 0 被双击
[Zoom] 打开缩放模态框
[Zoom] 图表元素: <div class="mermaid">...</div>
[Zoom] 模态框已显示
```

同时，页面上应该出现全屏黑色半透明背景的缩放模态框。

---

### 步骤 7: 如果双击无反应

#### 检查 1: 确认事件绑定

在控制台输入以下命令：

```javascript
// 检查有多少个 .mermaid 元素
document.querySelectorAll('.mermaid').length

// 检查第一个图表是否绑定了事件
document.querySelector('.mermaid')._zoomHandler

// 手动触发双击（应该打开模态框）
window.mdViewer.openDiagramZoom(document.querySelector('.mermaid'))
```

**如果最后一条命令能打开模态框**，说明功能正常，但双击事件未绑定。

#### 检查 2: 手动绑定事件

在控制台输入：

```javascript
// 手动绑定所有图表的双击事件
document.querySelectorAll('.mermaid').forEach((diagram, index) => {
    diagram.addEventListener('dblclick', () => {
        console.log('手动绑定的双击事件触发:', index);
        window.mdViewer.openDiagramZoom(diagram);
    });
});
```

然后再次尝试双击。如果能打开，说明问题在自动绑定逻辑。

#### 检查 3: CSS 冲突

某些 CSS 可能阻止事件传递。在控制台输入：

```javascript
// 检查图表的 pointer-events 样式
const diagram = document.querySelector('.mermaid');
window.getComputedStyle(diagram).pointerEvents
```

应该返回 `"auto"`。如果是 `"none"`，需要修改 CSS。

---

## 🔍 常见问题排查

### 问题 1: 模态框一闪而过

**原因**：可能有其他代码在关闭模态框

**检查**：
```javascript
// 查看模态框是否有 show 类
document.getElementById('diagramZoomModal').classList.contains('show')
```

**临时解决**：
```javascript
// 手动强制显示
document.getElementById('diagramZoomModal').classList.add('show');
```

---

### 问题 2: 双击选中了文字

**原因**：默认双击行为

**解决**：添加 CSS
```css
.mermaid {
    user-select: none;
    -webkit-user-select: none;
}
```

---

### 问题 3: 图表是代码高亮，不是渲染的 SVG

**原因**：Marked 渲染器配置问题

**检查**：
在浏览器中右键检查图表，如果是：
```html
<pre><code class="language-mermaid">...</code></pre>
```
而不是：
```html
<div class="mermaid"><svg>...</svg></div>
```

**解决**：检查 `standalone-app.js` 中的 `initMarked()` 方法：
```javascript
renderer.code = (code, language) => {
    if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;  // ✓ 正确
        // 不应该是：
        // return `<pre><code class="language-mermaid">${code}</code></pre>`;  // ✗ 错误
    }
    // ...
};
```

---

## 📊 完整测试方案

### 使用测试文件

1. 打开 `test-zoom.html` 文件
2. 这个文件包含了完整的自动检测
3. 查看每个测试部分的状态
4. 尝试双击测试图表

### 使用调试工具

1. 打开 `debug-zoom.html` 文件
2. 点击各个检查按钮
3. 查看详细的诊断信息
4. 复制日志发送给开发者

---

## 🛠️ 紧急修复

如果以上都不行，使用此临时脚本：

**在控制台粘贴执行**：

```javascript
// 紧急修复脚本
(function() {
    console.log('=== 紧急修复开始 ===');
    
    // 1. 确认模态框存在
    let modal = document.getElementById('diagramZoomModal');
    if (!modal) {
        console.error('模态框不存在！请检查 HTML 文件。');
        return;
    }
    
    // 2. 获取所有图表
    const diagrams = document.querySelectorAll('.mermaid');
    console.log(`找到 ${diagrams.length} 个图表`);
    
    if (diagrams.length === 0) {
        console.error('没有找到图表！请确认 Mermaid 已渲染。');
        return;
    }
    
    // 3. 强制绑定双击事件
    diagrams.forEach((diagram, index) => {
        // 移除可能存在的旧事件
        const newDiagram = diagram.cloneNode(true);
        diagram.parentNode.replaceChild(newDiagram, diagram);
        
        // 绑定新事件
        newDiagram.addEventListener('dblclick', function() {
            console.log(`图表 ${index} 被双击`);
            
            // 克隆图表
            const clone = this.cloneNode(true);
            clone.style.cursor = 'default';
            
            // 清空并插入
            const content = document.getElementById('zoomContent');
            content.innerHTML = '';
            content.appendChild(clone);
            
            // 显示模态框
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            console.log('模态框已打开');
        });
        
        // 设置样式
        newDiagram.style.cursor = 'zoom-in';
        newDiagram.title = '双击放大查看';
        
        console.log(`图表 ${index} 事件绑定完成`);
    });
    
    // 4. 绑定关闭事件
    const closeBtn = document.getElementById('zoomClose');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        };
    }
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    };
    
    console.log('=== 紧急修复完成 ===');
    console.log('请尝试双击图表');
})();
```

执行后，尝试双击任意图表。

---

## 📞 获取帮助

如果问题仍未解决，请提供以下信息：

1. **浏览器版本**：在控制台输入 `navigator.userAgent`
2. **控制台日志**：复制所有红色错误和警告
3. **检查结果**：运行上述检查命令的输出
4. **HTML 检查**：确认 `standalone.html` 中是否有 `<div id="diagramZoomModal">`
5. **文件时间戳**：确认 `standalone-app.js` 的最后修改时间

---

## ✅ 成功标志

当功能正常工作时，你应该看到：

1. ✓ 控制台有完整的初始化日志
2. ✓ 鼠标悬停时图表有 🔍 光标
3. ✓ 双击图表时模态框弹出
4. ✓ 控制台输出双击日志
5. ✓ 可以使用 +/- 按钮缩放
6. ✓ ESC 键可以关闭模态框

---

**祝调试顺利！** 🚀
