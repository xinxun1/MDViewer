# Markdown 链接跳转功能

## 功能概述

v1.7.1 新增了 Markdown 文件内部链接的自动跳转功能，支持相对路径的 `.md` 文件链接。

## 使用方法

### 相对路径链接

在 Markdown 文件中，可以使用相对路径链接到其他 `.md` 文件：

```markdown
[快速开始](./quick-start.md)
[上级目录文件](../README.md)
[同级文件](./features-demo.md)
```

### 支持的路径格式

1. **当前目录** - `./filename.md`
   ```markdown
   [查看功能演示](./features-demo.md)
   ```

2. **上级目录** - `../filename.md`
   ```markdown
   [返回README](../README.md)
   ```

3. **多级上级** - `../../filename.md`
   ```markdown
   [根目录文件](../../index.md)
   ```

4. **子目录** - `./subfolder/filename.md`（如果有的话）

### 点击行为

- **左键点击**：直接在当前窗口打开目标文件
- **外部链接**：http/https 开头的链接仍然在新标签页打开
- **相对路径**：`.md` 文件链接会被拦截并在当前应用中打开

## 工作原理

### 路径解析逻辑

```javascript
// 1. 获取当前文件路径
currentPath = "docs/subfolder/current.md"

// 2. 解析相对链接
href = "./target.md"  → "docs/subfolder/target.md"
href = "../other.md"  → "docs/other.md"
href = "../../root.md" → "root.md"
```

### 核心实现

```javascript
// 拦截链接点击
preview.querySelectorAll('a[href$=".md"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPath = resolveRelativePath(currentPath, href);
        loadFile(targetPath);
    });
});
```

## 实际示例

### 文档间导航

假设你在 `docs/features/advanced.md` 文件中：

```markdown
## 相关文档

- [基础功能](./basic.md) - 同目录跳转
- [总览](../overview.md) - 上级目录
- [首页](../../README.md) - 根目录
- [配置](../config/settings.md) - 兄弟目录
```

点击这些链接时：
- `./basic.md` → `docs/features/basic.md`
- `../overview.md` → `docs/overview.md`
- `../../README.md` → `README.md`
- `../config/settings.md` → `docs/config/settings.md`

## 注意事项

1. **文件必须存在**
   - 如果目标文件不在已打开的文件夹中，会提示 "文件不存在"
   - 确保链接的路径正确

2. **仅限 .md 文件**
   - 只拦截以 `.md` 结尾的相对路径链接
   - 其他文件类型（图片、PDF 等）不受影响

3. **外部链接不受影响**
   - `http://`、`https://` 开头的链接仍在新标签打开
   - 绝对路径链接按浏览器默认行为处理

4. **路径相对于当前文件**
   - 不是相对于项目根目录
   - 不是相对于 MDViewer 应用目录

## 测试链接

以下是一些测试链接（在 docs 目录中）：

- [快速开始指南](./quick-start.md)
- [功能演示](./features-demo.md)
- [文件夹记忆功能](./folder-memory.md)
- [分屏模式指南](./split-mode-guide.md)
- [返回 README](../README.md)

## 故障排查

### 链接点击无反应

1. 检查浏览器控制台是否有错误
2. 确认链接格式正确（以 `.md` 结尾）
3. 验证目标文件在文件树中可见

### 提示文件不存在

1. 检查相对路径是否正确
2. 确认目标文件在当前打开的文件夹内
3. 查看控制台日志中的计算路径

### 调试信息

打开浏览器控制台（F12），链接点击时会输出：

```
[Link] 当前文件: docs/current.md
[Link] 链接href: ./target.md
[Link] 目标路径: docs/target.md
```

## 更新日志

- **v1.7.1** (2026-01-12)
  - ✨ 新增 Markdown 文件链接自动跳转
  - 🎯 支持相对路径解析（./、../）
  - 📝 添加控制台调试日志
  - 🐛 修复路径计算逻辑

## 相关功能

- [文件夹记忆](./folder-memory.md) - 自动打开上次的文件夹
- [分屏模式](./split-mode-guide.md) - 编辑和预览同时显示
- [图表缩放](./zoom-feature-ready.md) - Mermaid 图表放大查看
