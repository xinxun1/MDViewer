# Mermaid 图表渲染测试

## ✅ MD Viewer 已支持 Mermaid！

你的 MD Viewer 已经完全支持 Mermaid 图表渲染，包括：

- ✅ 类图 (Class Diagram)
- ✅ 时序图 (Sequence Diagram)
- ✅ 流程图 (Flowchart)
- ✅ 状态图 (State Diagram)
- ✅ 甘特图 (Gantt Chart)
- ✅ 饼图 (Pie Chart)
- ✅ ER 图 (Entity Relationship)
- ✅ 用户旅程图 (User Journey)

## 🎯 如何在文档中使用

只需要在 Markdown 中使用这种格式：

````markdown
```mermaid
graph TD
    A[开始] --> B[处理]
    B --> C[结束]
```
````

## 📊 示例 1：简单流程图

```mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[处理A]
    B -->|否| D[处理B]
    C --> E[结束]
    D --> E
```

## 🏗️ 示例 2：类图（你的 UML）

```mermaid
classDiagram
    class BaseMoleculeEntity {
        <<Abstract>>
        +Vector3 Position
        +Vector3 Velocity
        +float Mass
        +float Radius
        +int ID
        +AddForce(Vector3 force)
        +Integrate(float deltaTime)
    }

    class WaterMolecule {
        +Construct()
    }

    class MagentaMolecule {
        +Construct()
    }

    class SimulationBoundary {
        +Vector3 BoundsSize
        +Vector3 Center
        +CheckBounds(Vector3 pos) bool
        +Reflect(Vector3 velocity, Vector3 normal) Vector3
    }

    BaseMoleculeEntity <|-- WaterMolecule
    BaseMoleculeEntity <|-- MagentaMolecule
```

## 📈 示例 3：时序图

```mermaid
sequenceDiagram
    participant A as 用户
    participant B as 系统
    participant C as 数据库
    
    A->>B: 发送请求
    B->>C: 查询数据
    C-->>B: 返回结果
    B-->>A: 显示数据
```

## 🔄 示例 4：状态图

```mermaid
stateDiagram-v2
    [*] --> 空闲
    空闲 --> 运行: 启动
    运行 --> 暂停: 暂停
    暂停 --> 运行: 继续
    运行 --> 停止: 停止
    停止 --> [*]
```

## 📅 示例 5：甘特图

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析           :a1, 2026-01-01, 7d
    UI设计            :a2, after a1, 5d
    section 开发阶段
    前端开发           :a3, after a2, 10d
    后端开发           :a4, after a2, 12d
    section 测试阶段
    功能测试           :a5, after a3, 5d
```

## 🥧 示例 6：饼图

```mermaid
pie title 浏览器使用占比
    "Chrome" : 65.5
    "Edge" : 15.2
    "Firefox" : 10.3
    "Safari" : 6.8
    "其他" : 2.2
```

## 🎨 主题配置

MD Viewer 当前使用 Mermaid 默认主题。如果你的 UML 图表显示不清楚，可以调整主题配置。

### 当前配置（在 standalone-app.js 中）

```javascript
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',      // 可选: default, forest, dark, neutral
    securityLevel: 'loose',
});
```

### 可用主题

1. **default** - 默认主题（蓝色系）
2. **forest** - 森林主题（绿色系）
3. **dark** - 深色主题（适合深色模式）
4. **neutral** - 中性主题（灰色系）

## 🔧 如果图表不显示

### 检查清单

1. ✅ **代码块语言标记**
   ```
   正确: ```mermaid
   错误: ```Mermaid 或 ```MERMAID
   ```

2. ✅ **语法正确性**
   - 确保 Mermaid 语法没有错误
   - 可以在 [Mermaid Live Editor](https://mermaid.live/) 测试

3. ✅ **浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 中是否有错误信息

4. ✅ **CDN 加载**
   - 确保网络连接正常
   - Mermaid 库能正常加载

## 📝 你的 UML 文档支持情况

根据你提供的 `03_UML_Diagrams.md` 文件：

### ✅ 类图 - 完全支持
```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog
```

### ✅ 时序图 - 完全支持
```mermaid
sequenceDiagram
    participant Client
    participant Server
    
    Client->>Server: 请求
    Server-->>Client: 响应
```

### ✅ 部署图 - 完全支持
```mermaid
graph TD
    A[客户端] --> B[负载均衡器]
    B --> C[服务器1]
    B --> D[服务器2]
    C --> E[数据库]
    D --> E
```

## 💡 优化建议

### 1. 调整深色模式下的 Mermaid 主题

如果你经常使用深色模式，可以让 Mermaid 根据主题自动切换：

**修改位置**: `public/js/standalone-app.js` 的 `initMarked()` 函数

```javascript
// 根据当前主题选择 Mermaid 主题
const isDark = document.body.getAttribute('data-theme') === 'dark';
mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
});
```

### 2. 增加图表缩放功能

对于复杂的大型 UML 图，可以添加缩放功能：

```css
/* 在 markdown.css 中添加 */
.mermaid {
    overflow: auto;
    max-width: 100%;
    cursor: grab;
}
```

### 3. 导出图表为图片

可以添加一个功能，将 Mermaid 图表导出为 PNG/SVG。

## 🎉 测试你的 UML 文档

现在你可以：

1. **打开 MD Viewer** 的 standalone.html
2. **选择文件夹** `i:\TestProject\UENative_PH\Documentation\Design\`
3. **打开文件** `03_UML_Diagrams.md`
4. **查看效果** - 所有 Mermaid 图表应该都能正常显示！

## 📚 更多 Mermaid 资源

- [官方文档](https://mermaid.js.org/)
- [在线编辑器](https://mermaid.live/)
- [语法参考](https://mermaid.js.org/intro/)
- [更多示例](https://mermaid.js.org/ecosystem/integrations.html)

---

**如果图表显示正常，你的 UML 文档就可以完美渲染了！** 🎊
