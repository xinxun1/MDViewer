# 欢迎使用 MD Viewer

这是一个功能丰富的 Markdown 阅读器示例文档，展示了各种 Markdown 语法的渲染效果。

## 目录

- [基础语法](#基础语法)
- [代码高亮](#代码高亮)
- [表格](#表格)
- [任务列表](#任务列表)
- [引用和提示](#引用和提示)

---

## 基础语法

### 文本样式

这是一段普通文本，包含 **粗体**、*斜体*、~~删除线~~ 和 `行内代码`。

你也可以使用 <kbd>Ctrl</kbd> + <kbd>S</kbd> 来保存文件。

### 链接和图片

- 这是一个 [外部链接](https://github.com)
- 这是一个 [内部锚点](#代码高亮)

### 列表

无序列表：
- 项目一
- 项目二
  - 子项目 A
  - 子项目 B
- 项目三

有序列表：
1. 第一步
2. 第二步
3. 第三步

---

## 代码高亮

### JavaScript

```javascript
// 一个简单的 Hello World 示例
function greet(name) {
    console.log(`Hello, ${name}!`);
    return {
        message: `Welcome, ${name}`,
        timestamp: new Date().toISOString()
    };
}

greet('MD Viewer');
```

### Python

```python
# Python 示例代码
def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# 输出前10个数
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

### HTML/CSS

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>示例页面</title>
    <style>
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World</h1>
    </div>
</body>
</html>
```

### Shell 命令

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 查看帮助
node server.js --help
```

---

## 表格

| 功能 | 支持 | 说明 |
|------|:----:|------|
| GFM 语法 | ✅ | GitHub Flavored Markdown |
| 代码高亮 | ✅ | 支持 180+ 种语言 |
| 表格 | ✅ | 支持对齐 |
| 任务列表 | ✅ | 带复选框 |
| 数学公式 | ⚠️ | 待支持 |
| 流程图 | ⚠️ | 待支持 |

---

## 任务列表

项目进度：

- [x] 创建项目结构
- [x] 实现文件浏览
- [x] Markdown 解析和渲染
- [x] 代码语法高亮
- [x] 编辑功能
- [x] 深色模式
- [ ] 数学公式支持
- [ ] 流程图支持
- [ ] 导出 PDF

---

## 引用和提示

> 💡 **提示**: 这是一个引用块，可以用来展示重要信息或引用内容。
> 
> 引用可以包含多行内容，以及 **格式化文本**。

### 嵌套引用

> 第一层引用
> > 第二层引用
> > > 第三层引用

---

## 水平分割线

使用三个或更多的 `-`、`*` 或 `_` 创建分割线：

---

***

___

---

## 脚注示例

这是一段包含脚注的文本[^1]。你也可以使用命名脚注[^note]。

[^1]: 这是脚注的内容。
[^note]: 这是命名脚注的内容。

---

## 结语

感谢使用 **MD Viewer**！如果你有任何问题或建议，欢迎提交 Issue。

Happy Writing! 📝
