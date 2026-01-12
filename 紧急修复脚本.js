// 紧急修复脚本 - 在浏览器控制台执行
// 强制重新绑定所有 Mermaid 图表的双击事件

console.log('🔧 开始紧急修复...');

// 获取所有图表
const diagrams = document.querySelectorAll('.mermaid');
console.log(`找到 ${diagrams.length} 个图表`);

if (diagrams.length === 0) {
    console.error('❌ 没有找到 .mermaid 元素！');
} else {
    // 为每个图表绑定双击事件
    diagrams.forEach((diagram, index) => {
        // 设置样式
        diagram.style.cursor = 'zoom-in';
        diagram.title = '双击放大查看';
        diagram.style.userSelect = 'none';
        
        // 移除旧事件（如果有）
        const newDiagram = diagram.cloneNode(true);
        diagram.parentNode.replaceChild(newDiagram, diagram);
        
        // 绑定新的双击事件
        newDiagram.addEventListener('dblclick', function(e) {
            console.log(`✓ 图表 ${index} 被双击！`);
            e.stopPropagation();
            
            const modal = document.getElementById('diagramZoomModal');
            const content = document.getElementById('zoomContent');
            
            if (!modal || !content) {
                console.error('❌ 模态框元素不存在！');
                return;
            }
            
            // 克隆并显示图表
            const clone = this.cloneNode(true);
            clone.style.cursor = 'default';
            clone.style.maxWidth = 'none';
            clone.style.transform = 'scale(1)';
            
            content.innerHTML = '';
            content.appendChild(clone);
            
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            console.log('✓ 模态框已打开');
        });
        
        console.log(`✓ 图表 ${index} 修复完成`);
    });
    
    // 绑定关闭功能
    const closeBtn = document.getElementById('zoomClose');
    const modal = document.getElementById('diagramZoomModal');
    
    if (closeBtn && modal) {
        closeBtn.onclick = function() {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            console.log('✓ 模态框已关闭');
        };
        
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
                console.log('✓ 模态框已关闭');
            }
        };
        
        // ESC 键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
                console.log('✓ 模态框已关闭（ESC）');
            }
        });
    }
    
    console.log('✅ 紧急修复完成！现在试试双击图表');
}
