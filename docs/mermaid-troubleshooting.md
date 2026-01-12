# Mermaid 图表不显示 - 故障排查指南

## 🔍 问题诊断步骤

### 第 1 步：打开浏览器控制台

1. **打开 MD Viewer** (`standalone.html`)
2. **按 F12** 打开开发者工具
3. **切换到 Console 标签**

### 第 2 步：检查 Mermaid 库是否加载

在控制台输入以下命令：

```javascript
typeof mermaid
```

**预期结果**：
```
"object"  // ✅ 正常
```

**如果返回**：
```
"undefined"  // ❌ Mermaid 未加载
```

**解决方法**：
- 检查网络连接
- 查看 Network 标签，确认 `mermaid.min.js` 是否成功加载
- 尝试更换 CDN 源

---

### 第 3 步：检查 Mermaid 版本

在控制台输入：

```javascript
mermaid.version
```

**预期结果**：
```
"10.6.1"  // 或类似版本号
```

---

### 第 4 步：检查 Mermaid 初始化

在控制台输入：

```javascript
mermaid.mermaidAPI.getConfig()
```

**预期输出**：应该看到配置对象，包括：
```javascript
{
  theme: "default",  // 或 "dark"
  startOnLoad: false,
  securityLevel: "loose",
  ...
}
```

---

### 第 5 步：手动测试 Mermaid 渲染

1. **打开你的 UML 文档**
2. **在控制台输入**：

```javascript
// 查找所有 .mermaid 元素
document.querySelectorAll('.mermaid')
```

**预期结果**：
```
NodeList(3) [div.mermaid, div.mermaid, div.mermaid]  // 三个图表
```

**如果返回**：
```
NodeList []  // ❌ 没有找到 mermaid 元素
```

这说明 Markdown 解析有问题。

---

### 第 6 步：检查 HTML 结构

在控制台输入：

```javascript
// 查看第一个 mermaid 元素的内容
document.querySelector('.mermaid')?.innerHTML.substring(0, 100)
```

**预期结果**：应该看到 Mermaid 代码
```
"classDiagram\n    %% Core Entities\n    class BaseMoleculeEntity {\n        <<Abstract>>"
```

**如果看到**：
```
"<svg>...</svg>"  // ✅ 已经渲染成 SVG
```

---

### 第 7 步：手动触发 Mermaid 渲染

在控制台输入：

```javascript
// 手动渲染所有 mermaid 图表
const elements = document.querySelectorAll('.mermaid');
elements.forEach((el, i) => {
    el.id = `mermaid-test-${i}`;
});
mermaid.run({ nodes: elements });
```

**观察结果**：
- ✅ 图表应该出现
- ❌ 如果报错，查看错误信息

---

### 第 8 步：检查 CSS 样式

在控制台输入：

```javascript
// 检查 mermaid 元素的样式
const el = document.querySelector('.mermaid');
if (el) {
    console.log('Display:', window.getComputedStyle(el).display);
    console.log('Visibility:', window.getComputedStyle(el).visibility);
    console.log('Width:', window.getComputedStyle(el).width);
    console.log('Height:', window.getComputedStyle(el).height);
}
```

**预期结果**：
```
Display: block
Visibility: visible
Width: 具体数值 (不是 0px)
Height: 具体数值 (不是 0px)
```

---

## 🛠️ 常见问题及解决方案

### 问题 1：Mermaid 库未加载

**症状**：`typeof mermaid` 返回 `"undefined"`

**原因**：
- 网络连接问题
- CDN 被墙或无法访问
- 浏览器扩展阻止了脚本

**解决方法**：

#### 方法 A：检查网络
1. 打开 Network 标签
2. 刷新页面（F5）
3. 查找 `mermaid.min.js`
4. 如果显示失败，检查网络连接

#### 方法 B：更换 CDN

编辑 `standalone.html`，将：
```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
```

改为：
```html
<script src="https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js"></script>
```

或者：
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"></script>
```

---

### 问题 2：代码块没有被识别为 Mermaid

**症状**：`document.querySelectorAll('.mermaid')` 返回空

**原因**：
- Markdown 代码块的语言标识不对
- marked.js 的 renderer 配置问题

**检查要点**：

1. **Markdown 语法正确**：
```markdown
```mermaid
graph TD
    A --> B
```  (这里有三个反引号)
```

注意：
- ✅ 正确：\`\`\`mermaid
- ❌ 错误：\`\`\`Mermaid
- ❌ 错误：\`\`\`MERMAID

2. **查看渲染后的 HTML**：

在控制台输入：
```javascript
document.getElementById('preview').innerHTML.substring(0, 500)
```

应该看到 `<div class="mermaid">` 而不是 `<pre><code class="language-mermaid">`

---

### 问题 3：Mermaid 元素存在但没有渲染

**症状**：能找到 `.mermaid` 元素，但还是文本

**原因**：
- `mermaid.run()` 没有被调用
- `updatePreview()` 函数有问题

**解决方法**：

手动触发渲染：
```javascript
const app = new MDViewerStandalone();
app.updatePreview();
```

或者直接：
```javascript
mermaid.run();
```

---

### 问题 4：Mermaid 语法错误

**症状**：控制台显示 Mermaid 渲染错误

**检查方法**：

1. **复制 Mermaid 代码**
2. **访问** [Mermaid Live Editor](https://mermaid.live/)
3. **粘贴代码**
4. **查看是否有语法错误**

**常见错误**：
- 缺少分号
- 关系符号错误
- 类名或方法名格式不对
- 特殊字符未转义

---

## 🚀 快速修复脚本

如果以上都检查过了，但还是不显示，执行这个脚本：

### 强制刷新和重新渲染

```javascript
// 1. 清除缓存
localStorage.clear();

// 2. 重新加载 Mermaid
if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
    });
}

// 3. 查找并渲染所有 mermaid 元素
const mermaidElements = document.querySelectorAll('.mermaid');
console.log(`找到 ${mermaidElements.length} 个 Mermaid 图表`);

if (mermaidElements.length > 0) {
    mermaidElements.forEach((element, index) => {
        element.id = `mermaid-fix-${index}`;
        element.removeAttribute('data-processed');
    });
    
    mermaid.run({
        nodes: mermaidElements
    }).then(() => {
        console.log('✅ Mermaid 图表渲染成功！');
    }).catch(err => {
        console.error('❌ Mermaid 渲染失败:', err);
    });
} else {
    console.warn('⚠️ 没有找到 .mermaid 元素');
    console.log('检查 HTML 结构:');
    console.log(document.getElementById('preview')?.innerHTML.substring(0, 500));
}
```

---

## 📋 完整检查清单

执行以下步骤，记录结果：

- [ ] `typeof mermaid` → 返回 `"object"`
- [ ] `mermaid.version` → 返回版本号
- [ ] `document.querySelectorAll('.mermaid').length` → 大于 0
- [ ] 查看 `.mermaid` 元素内容 → 包含 Mermaid 代码
- [ ] 查看 Network 标签 → `mermaid.min.js` 加载成功 (200)
- [ ] 查看 Console → 没有 Mermaid 相关错误
- [ ] 手动运行 `mermaid.run()` → 图表显示

---

## 💡 需要提供的信息

如果问题仍未解决，请提供以下信息：

1. **控制台截图** - 包括所有错误和警告
2. **Network 标签截图** - 显示所有资源加载状态
3. **以下命令的输出**：
```javascript
console.log('Mermaid:', typeof mermaid);
console.log('Version:', typeof mermaid !== 'undefined' ? mermaid.version : 'N/A');
console.log('Elements:', document.querySelectorAll('.mermaid').length);
console.log('Preview HTML:', document.getElementById('preview')?.innerHTML.substring(0, 200));
```

---

**按照这个指南逐步排查，一定能找到问题！** 🔍
