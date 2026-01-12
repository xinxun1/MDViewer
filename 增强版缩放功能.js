// 增强版缩放功能 - 改进放大效果
// 在浏览器控制台执行此脚本

console.log('🚀 开始安装增强版缩放功能...\n');

// 全局变量
let currentScale = 1;
let isPanning = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

// 获取元素
const modal = document.getElementById('diagramZoomModal');
const content = document.getElementById('zoomContent');
const zoomLevel = document.getElementById('zoomLevel');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const zoomReset = document.getElementById('zoomReset');
const closeBtn = document.getElementById('zoomClose');

// 更新变换
function updateTransform() {
    const diagram = content.firstChild;
    if (!diagram) return;
    
    diagram.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    diagram.style.transition = isPanning ? 'none' : 'transform 0.3s ease';
    
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
    }
}

// 缩放函数 - 更灵活的步进
function zoom(delta) {
    const oldScale = currentScale;
    
    // 根据当前缩放级别调整步进
    let step;
    if (currentScale < 1) {
        step = 0.1;  // 小于 100% 时步进 10%
    } else if (currentScale < 2) {
        step = 0.2;  // 100%-200% 时步进 20%
    } else {
        step = 0.5;  // 大于 200% 时步进 50%
    }
    
    currentScale = Math.max(0.5, Math.min(5, currentScale + (delta > 0 ? step : -step)));
    updateTransform();
    
    console.log(`缩放: ${Math.round(oldScale * 100)}% → ${Math.round(currentScale * 100)}%`);
}

// 重置函数 - 智能适配
function resetZoom() {
    const diagram = content.firstChild;
    if (!diagram) return;
    
    const svg = diagram.querySelector('svg');
    if (!svg) return;
    
    // 获取容器和 SVG 尺寸
    const containerWidth = content.clientWidth;
    const containerHeight = content.clientHeight;
    const svgWidth = svg.getBBox ? svg.getBBox().width : svg.clientWidth;
    const svgHeight = svg.getBBox ? svg.getBBox().height : svg.clientHeight;
    
    // 计算最佳缩放比例（留 10% 边距）
    const scaleX = (containerWidth * 0.9) / svgWidth;
    const scaleY = (containerHeight * 0.9) / svgHeight;
    const optimalScale = Math.min(scaleX, scaleY, 1.5); // 最大 150%
    
    currentScale = Math.max(0.8, optimalScale); // 最小 80%
    translateX = 0;
    translateY = 0;
    updateTransform();
    
    console.log(`重置缩放到最佳比例: ${Math.round(currentScale * 100)}%`);
}

// 平移功能 - 拖动查看
content.addEventListener('mousedown', (e) => {
    if (currentScale <= 1) return; // 只在放大时允许平移
    
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    content.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});

document.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        content.style.cursor = currentScale > 1 ? 'grab' : 'default';
    }
});

// 绑定按钮
if (zoomIn) {
    zoomIn.onclick = () => zoom(1);
}

if (zoomOut) {
    zoomOut.onclick = () => zoom(-1);
}

if (zoomReset) {
    zoomReset.onclick = () => resetZoom();
}

if (closeBtn) {
    closeBtn.onclick = () => {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        currentScale = 1;
        translateX = 0;
        translateY = 0;
    };
}

// 背景点击关闭
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        currentScale = 1;
        translateX = 0;
        translateY = 0;
    }
});

// 键盘控制 - 增强版
document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('show')) return;
    
    switch(e.key) {
        case 'Escape':
            modal.classList.remove('show');
            document.body.style.overflow = '';
            currentScale = 1;
            translateX = 0;
            translateY = 0;
            break;
        case '+':
        case '=':
            zoom(1);
            break;
        case '-':
            zoom(-1);
            break;
        case '0':
            resetZoom();
            break;
        case 'f':
        case 'F':
            // F 键：适应窗口
            resetZoom();
            break;
        case 'ArrowLeft':
            translateX += 50;
            updateTransform();
            break;
        case 'ArrowRight':
            translateX -= 50;
            updateTransform();
            break;
        case 'ArrowUp':
            translateY += 50;
            updateTransform();
            break;
        case 'ArrowDown':
            translateY -= 50;
            updateTransform();
            break;
    }
});

// 滚轮缩放 - 改进版
content.addEventListener('wheel', (e) => {
    if (!modal.classList.contains('show')) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -1 : 1;
    zoom(delta * 0.5); // 更平滑的滚轮缩放
});

// 为所有图表重新绑定双击事件
document.querySelectorAll('.mermaid').forEach((diagram, index) => {
    if (!diagram.querySelector('svg')) return;
    
    // 清除旧事件
    const newDiagram = diagram.cloneNode(true);
    diagram.parentNode.replaceChild(newDiagram, diagram);
    
    newDiagram.style.cursor = 'zoom-in';
    newDiagram.style.userSelect = 'none';
    newDiagram.title = '双击放大查看 (可拖动/滚轮缩放)';
    
    newDiagram.ondblclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const clone = this.cloneNode(true);
        clone.style.cursor = 'default';
        clone.style.maxWidth = 'none';
        clone.style.maxHeight = 'none';
        
        content.innerHTML = '';
        content.appendChild(clone);
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // 智能初始缩放
        setTimeout(() => {
            resetZoom();
        }, 100);
        
        console.log(`✓ 图表 ${index} 已打开（增强版）`);
    };
});

console.log('✅ 增强版缩放功能安装完成！\n');
console.log('新功能：');
console.log('  📌 智能适配 - 自动调整到最佳大小');
console.log('  🖱️ 拖动平移 - 放大后可拖动查看');
console.log('  ⌨️ 方向键 - 使用方向键移动视图');
console.log('  🔤 F 键 - 适应窗口大小');
console.log('  🔄 灵活缩放 - 根据当前大小智能调整步进');
console.log('  📊 最大缩放 - 可以放大到 500%');
console.log('');
console.log('👉 现在双击任意图表试试！');
