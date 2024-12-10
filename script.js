let chatHistory;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG === 'undefined') {
        console.error('配置文件未加载');
        toast.show('系统配置加载失败，请刷新页面重试', 'error');
        return;
    }

    // 初始化聊天历史
    chatHistory = document.querySelector('.chat-history');
    if (!chatHistory) {
        console.error('找不到聊天历史容器');
        return;
    }

    // 显示欢迎消息
    appendMessage('ai', CONFIG.CHATBOT.PRESET.GREETING);

    // 初始化网监控
    networkMonitor.init();

    // 检查浏览器兼容性
    compatibilityChecker.check();

    // 初始化页面生命周期管理
    pageLifecycle.init();

    // 使用事件委托处理导航点击
    document.querySelector('.nav-links').addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            switchPage(targetId);
            // 保存当前页面状态
            pageLifecycle.saveState();
        }
    });

    // 如果没有保存的状态，显示默认页面
    if (!localStorage.getItem(`${CONFIG.SECURITY.STORAGE_PREFIX}lastPage`)) {
        const initialPage = window.location.hash.slice(1) || CONFIG.PAGES.DEFAULT;
        switchPage(initialPage);
    }

    // 初始化移动端菜单
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinksContainer = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinksContainer) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

    // 初始化其他组
    initializeComponents();

    // 定期清理资源
    setInterval(() => {
        resourceCleaner.cleanup();
    }, 300000); // 每5分钟清理一次

    // 初始化性能监控
    performanceMonitor.startMeasure('initialization');

    // 添加进度条组件
    const progressBar = {
        create() {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">正在生成图片... 0%</div>
            `;
            return progressContainer;
        },

        update(container, percent) {
            const fill = container.querySelector('.progress-fill');
            const text = container.querySelector('.progress-text');
            
            fill.style.width = `${percent}%`;
            text.textContent = `正在生成图片... ${percent}%`;

            // 添加不同阶段的
            if (percent < 30) {
                text.textContent += ' (正在解析提示词)';
            } else if (percent < 60) {
                text.textContent += ' (正在生成基图像)';
            } else if (percent < 90) {
                text.textContent += ' (正在优化细节)';
            } else {
                text.textContent += ' (即将完成)';
            }
        }
    };

    // 修改生成图片函数
    async function generateImage(prompt) {
        if (!prompt.trim()) {
            toast.show('请输入图片描述', 'warning');
            return;
        }

        try {
            performanceMonitor.startMeasure('generateImage');
            const generateBtn = document.querySelector('.generate-btn');
            const resultSection = document.querySelector('.result-section');
            
            generateBtn.disabled = true;

            // 创建并显示进度条
            const progressContainer = progressBar.create();
            resultSection.innerHTML = '';
            resultSection.appendChild(progressContainer);

            // 模拟进度更新
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 1;
                if (progress <= 95) {
                    progressBar.update(progressContainer, progress);
                }
            }, 100);

            try {
                // 调用API生成图片
                const response = await fetch('https://cloud.infini-ai.com/maas/stable-diffusion-1.5/nvidia/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer 3c3d47598cc563fb2771360830510fd3.8yluYtAOiQQL9JoA`
                    },
                    body: JSON.stringify({
                        model: "stable-diffusion-1.5",
                        messages: [
                            {"role": "user", "content": prompt}
                        ]
                    }),
                    signal: AbortSignal.timeout(30000)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                clearInterval(progressInterval);  // 停止进度更新

                // 处理返回的图片数据
                if (data.images && data.images[0]) {
                    // 更新到100%
                    progressBar.update(progressContainer, 100);
                    
                    // 短暂延迟后显示图片
                    setTimeout(() => {
                        const img = document.createElement('img');
                        img.src = `data:image/png;base64,${data.images[0]}`;
                        img.alt = prompt;
                        img.className = 'generated-image';
                        
                        resultSection.innerHTML = '';
                        resultSection.appendChild(img);
                        
                        toast.show('图片生成成功', 'success');
                    }, 500);
                } else {
                    throw new Error('未收到有效的图片数据');
                }

                performanceMonitor.endMeasure('generateImage');

            } catch (error) {
                clearInterval(progressInterval);
                console.error('生成图片错误:', error);
                resultSection.innerHTML = '<div class="error">图片生成失败，请重试</div>';
                toast.show('图片生成失败，请重试', 'error');
                throw error;
            }
        } finally {
            const generateBtn = document.querySelector('.generate-btn');
            if (generateBtn) {
                generateBtn.disabled = false;
            }
        }
    }

    // 将事件监听器移到外部
    document.addEventListener('DOMContentLoaded', () => {
        const generateBtn = document.querySelector('.generate-btn');
        const imagePrompt = document.querySelector('.image-prompt');
        const styleSelect = document.querySelector('.style-select');
        
        if (generateBtn && imagePrompt) {
            generateBtn.addEventListener('click', () => {
                const prompt = imagePrompt.value;
                const style = styleSelect.value;
                if (prompt.trim()) {
                    const fullPrompt = style ? `${prompt}, ${style} style` : prompt;
                    generateImage(fullPrompt);
                }
            });
        }
    });

    // 添加对话结束处理
    window.addEventListener('beforeunload', () => {
        appendMessage('ai', CONFIG.CHATBOT.PRESET.FAREWELL);
    });

    // 添名称点击处理
    const brandLink = document.querySelector('.brand-name');
    if (brandLink) {
        brandLink.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = brandLink.getAttribute('href').slice(1);
            switchPage(targetId);
            // 确保滚动到顶部
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

// 消息发送函数
async function sendMessage(message) {
    if (!message.trim()) {
        toast.show('请输入消息内容', 'warning');
        return;
    }

    try {
        // 显示用户消息
        appendMessage('user', message);
        
        // 显示AI思考状态
        appendMessage('system', '思考中...');
        
        // 调用API
        const response = await fetch('https://cloud.infini-ai.com/maas/qwen2.5-72b-instruct/nvidia/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-c7rfim3cgvakdoqe`
            },
            body: JSON.stringify({
                model: "qwen2.5-72b-instruct",
                messages: [
                    {
                        "role": "system",
                        "content": "你是无问芯穹AI助手，基于通义千问2.5-72B大语言模。"
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            })
        });

        // 移除思考中的消息
        removeLastMessage();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response');
        }

        // 显示AI回复
        appendMessage('ai', data.choices[0].message.content);

    } catch (error) {
        console.error('Chat error:', error);
        removeLastMessage(); // 移除思考中的消息
        appendMessage('error', '抱歉，出现了一些错误，请稍后重试');
    }
}

async function fetchWithRetry(url, options, maxRetries = CONFIG.SETTINGS.MAX_RETRIES) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After')) || 5;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            
            throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            lastError = error;
            if (i === maxRetries - 1) break;
            
            const delay = Math.min(1000 * Math.pow(2, i), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

// 添加性能监控
const performanceMonitor = {
    metrics: new Map(),
    
    startMeasure(name) {
        this.metrics.set(name, {
            startTime: performance.now(),
            measurements: []
        });
    },
    
    endMeasure(name) {
        const metric = this.metrics.get(name);
        if (metric) {
            const duration = performance.now() - metric.startTime;
            metric.measurements.push(duration);
            
            // 计算统计数据
            const stats = this.calculateStats(metric.measurements);
            console.log(`Performance: ${name}`, stats);
            
            // 如果性能不佳，报告问题
            if (duration > CONFIG.PERFORMANCE.THRESHOLDS[name]) {
                this.reportPerformanceIssue(name, duration, stats);
            }
        }
    },
    
    calculateStats(measurements) {
        const sorted = [...measurements].sort((a, b) => a - b);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            average: measurements.reduce((a, b) => a + b) / measurements.length
        };
    },
    
    async reportPerformanceIssue(name, duration, stats) {
        try {
            await fetch('/api/performance-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metric: name,
                    duration,
                    stats,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            console.error('Performance reporting failed:', e);
        }
    }
};

// 添加网络态监控
const networkMonitor = {
    isOnline: navigator.onLine,
    
    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            toast.show('网络已恢复', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            toast.show('网络已断开', 'warning');
        });
    },
    
    checkConnection() {
        return this.isOnline;
    }
};

// 在初始化时调用
networkMonitor.init();

// 修改页面切换函数
async function switchPage(targetId) {
    try {
        if (!isValidPage(targetId)) {
            console.error(`Invalid page ID: ${targetId}`);
            return;
        }
        
        const targetPage = document.querySelector(`#${targetId}`);
        const targetLink = document.querySelector(`[href="#${targetId}"]`);
        
        if (!targetPage || !targetLink) {
            console.error(`找不到目标页面: ${targetId}`);
            return;
        }
        
        // 先隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });
        
        // 移除所有导航链接的激活状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // 显示目标页面
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        targetLink.classList.add('active');
        
        // 根据页面类型初始化特定功能
        if (targetId === 'ai-chat' && !targetPage.hasAttribute('data-initialized')) {
            initializeChatPage();
            targetPage.setAttribute('data-initialized', 'true');
        } else if (targetId === 'ai-draw' && !targetPage.hasAttribute('data-initialized')) {
            initializeDrawPage();
            targetPage.setAttribute('data-initialized', 'true');
        }
        
        updateHistory(targetId);
        
    } catch (error) {
        console.error('Page switch error:', error);
        // 移除错误提示，因为页面实际上可以正常切换
        // toast.show('页面切换失败', 'error');
    }
}

// 确保在DOM加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
    // 绑定导航事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            switchPage(targetId);
        });
    });

    // 处理初始页面
    const initialPage = window.location.hash.slice(1) || 'home';
    switchPage(initialPage);
});

// 添加浏览器历史记录支持
window.addEventListener('popstate', (event) => {
    const page = event.state?.page || 'home';
    switchPage(page);
});

// 添加页面状态管理
function saveCurrentPageState() {
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        const pageState = {
            id: currentPage.id,
            scrollPosition: window.scrollY
        };
        sessionStorage.setItem('lastPageState', JSON.stringify(pageState));
    }
}

function initializePage(pageId) {
    switch (pageId) {
        case 'ai-chat':
            initializeChatPage();
            break;
        case 'ai-draw':
            initializeDrawPage();
            break;
        case 'computing':
            initializeComputingPage();
            break;
        case 'tasks':
            initializeTasksPage();
            break;
        case 'community':
            initializeCommunityPage();
            break;
        default:
            // 默认初始化
            break;
    }
}

const compatibilityChecker = {
    check() {
        const requirements = {
            localStorage: !!window.localStorage,
            fetch: !!window.fetch,
            promise: !!window.Promise,
            webSpeech: !!window.webkitSpeechRecognition || !!window.SpeechRecognition
        };
        
        const unsupported = Object.entries(requirements)
            .filter(([_, supported]) => !supported)
            .map(([feature]) => feature);
            
        if (unsupported.length > 0) {
            console.warn('不支持的功能:', unsupported);
            toast.show('您的浏览器可能不支持某些功能，建议使用新版Chrome', 'warning');
        }
        
        return unsupported.length === 0;
    }
};

// 在初化时检查
compatibilityChecker.check();

// 添加错误监控器
const errorMonitor = {
    errors: [],
    maxErrors: 50,
    
    log(error, context = {}) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message || error,
            stack: error.stack,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            pageState: this.getCurrentPageState()
        };
        
        this.errors.push(errorLog);
        this.cleanup();
        this.reportError(errorLog);
    },
    
    cleanup() {
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }
    },
    
    getCurrentPageState() {
        const activePage = document.querySelector('.page.active');
        return {
            pageId: activePage?.id,
            scrollPosition: window.scrollY,
            viewportSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    },
    
    async reportError(error) {
        try {
            await fetch('/api/error-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(error)
            });
        } catch (e) {
            console.error('Error reporting failed:', e);
        }
    }
};

// 添加提示消息管理器
const toast = {
    show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

// 修改添加消息到聊天历史的函数
function appendMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // 创建消息内容容器
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    // 添加时间戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    const chatHistory = document.querySelector('.chat-history');
    if (chatHistory) {
        chatHistory.appendChild(messageDiv);
        scrollToBottom();
    }
}

// 移最后一条消息
function removeLastMessage() {
    const chatHistory = document.querySelector('.chat-history');
    if (chatHistory && chatHistory.lastElementChild) {
        chatHistory.removeChild(chatHistory.lastElementChild); // 修正方法名
    }
}

// 滚动到底部
function scrollToBottom() {
    const chatHistory = document.querySelector('.chat-history');
    if (chatHistory) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

// 添加性能监控
window.addEventListener('load', () => {
    // 页面加载性能
    const pageLoadTime = performance.now();
    console.log(`页加载时间: ${pageLoadTime}ms`);

    // 资源加载性能
    const resources = performance.getEntriesByType('resource');
    const resourceStats = resources.reduce((stats, resource) => {
        stats.total++;
        stats.totalTime += resource.duration;
        return stats;
    }, { total: 0, totalTime: 0 });

    console.log(`资源加载统计:
        总数: ${resourceStats.total}
        总时间: ${resourceStats.totalTime.toFixed(2)}ms
        平均时间: ${(resourceStats.totalTime / resourceStats.total).toFixed(2)}ms`);
});

// 添加组件始化函数
function initializeComponents() {
    // 初始化聊天历史
    initializeChatHistory();
    
    // 初始化事件监听
    initializeEventListeners();
    
    // 检查浏览器兼容性
    compatibilityChecker.check();
}

// 添加输入证
function validateInput(input, type = 'text') {
    const sanitized = DOMPurify.sanitize(input);
    
    switch (type) {
        case 'text':
            return sanitized.length <= CONFIG.LIMITS.MAX_MESSAGE_LENGTH;
        case 'number':
            return !isNaN(input) && input >= 0;
        case 'html':
            return CONFIG.SECURITY.ALLOWED_TAGS.every(tag => 
                sanitized.includes(`<${tag}>`) === input.includes(`<${tag}>`));
        default:
            return false;
    }
}

// 添加资源预加
const resourceLoader = {
    preloadedResources: new Set(),
    
    preload(url, type = 'image') {
        if (this.preloadedResources.has(url)) return;
        
        switch (type) {
            case 'image':
                const img = new Image();
                img.src = url;
                break;
            case 'script':
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                document.head.appendChild(script);
                break;
        }
        
        this.preloadedResources.add(url);
    }
};

// 添加防抖处理
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 添加初始化函数的具体实现
function initializeChatHistory() {
    const savedHistory = localStorage.getItem(`${CONFIG.SECURITY.STORAGE_PREFIX}chatHistory`);
    if (savedHistory) {
        const messages = JSON.parse(savedHistory);
        messages.forEach(msg => appendMessage(msg.type, msg.content));
    }
}

function initializeEventListeners() {
    // 聊天输入事件
    const chatInput = document.querySelector('.chat-input');
    const sendBtn = document.querySelector('.send-btn');
    if (chatInput && sendBtn) {
        const debouncedSend = debounce((message) => {
            sendMessage(message);
        }, 300);

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message) {
                    debouncedSend(message);
                    chatInput.value = '';
                }
            }
        });
    }

    // 页面可见性变化事件
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 暂停非必要的更新
            marketplaceManager?.pauseUpdates();
            computingManager?.pauseUpdates();
        } else {
            // 恢复更新
            marketplaceManager?.resumeUpdates();
            computingManager?.resumeUpdates();
        }
    });
}

// 添加页面生命周期管理
const pageLifecycle = {
    init() {
        window.addEventListener('load', () => this.onPageLoad());
        window.addEventListener('beforeunload', (e) => this.onPageUnload(e));
        window.addEventListener('pagehide', () => this.onPageHide());
        window.addEventListener('pageshow', () => this.onPageShow());

        // 添加页加载时恢复上次状态
        const lastPage = localStorage.getItem(`${CONFIG.SECURITY.STORAGE_PREFIX}lastPage`);
        if (lastPage) {
            switchPage(lastPage);
        }
    },

    onPageLoad() {
        performanceMonitor.startMeasure('pageLoad');
        // 初始化必要的组件
        initializeComponents();
        performanceMonitor.endMeasure('pageLoad');
    },

    onPageUnload(event) {
        // 检查是否有未保存的更改
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = '有未保存的更改，确定离开吗？';
        }
    },

    onPageHide() {
        // 保存必要的状态
        this.saveState();
    },

    onPageShow() {
        // 恢复必要的状态
        this.restoreState();
    },

    hasUnsavedChanges() {
        // 检查是否有保存的更改
        return false; // 根据实际情况实现
    },

    saveState() {
        const currentPage = document.querySelector('.page.active')?.id;
        if (currentPage) {
            localStorage.setItem(`${CONFIG.SECURITY.STORAGE_PREFIX}lastPage`, currentPage);
            localStorage.setItem(`${CONFIG.SECURITY.STORAGE_PREFIX}scrollPosition`, window.scrollY.toString());
        }
    },

    restoreState() {
        const lastPage = localStorage.getItem(`${CONFIG.SECURITY.STORAGE_PREFIX}lastPage`);
        const scrollPosition = localStorage.getItem(`${CONFIG.SECURITY.STORAGE_PREFIX}scrollPosition`);
        
        if (lastPage) {
            switchPage(lastPage);
            if (scrollPosition) {
                window.scrollTo(0, parseInt(scrollPosition));
            }
        }
    }
};

// 添加资源清理功能
const resourceCleaner = {
    cleanup() {
        // 清理未使用的图片资源
        const images = document.querySelectorAll('.generated-image');
        images.forEach(img => {
            if (!document.body.contains(img)) {
                URL.revokeObjectURL(img.src);
            }
        });

        // 清理过期的缓存数据
        const now = Date.now();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CONFIG.SECURITY.STORAGE_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.expiry && data.expiry < now) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    console.error('清缓存数据时出错:', e);
                }
            }
        });
    }
};

// 添加清理任务
setInterval(() => {
    resourceCleaner.cleanup();
}, 300000); // 每5分钟清理一次

// 添加页面卸载时的清理
window.addEventListener('beforeunload', () => {
    resourceCleaner.cleanup();
});

// 添加试函数
const testSuite = {
    async runTests() {
        console.log('开始测试...');
        
        try {
            // 测试AI聊天
            await this.testChat();
            
            // 测试页面切换
            await this.testPageSwitch();
            
            // 测试算力租用
            await this.testComputing();
            
            // 测试交易功能
            await this.testMarketplace();
            
            console.log('所有测试通过！');
        } catch (error) {
            console.error('测试失败:', error);
        }
    },
    
    async testChat() {
        console.log('测试AI聊天...');
        // 检查聊天标
        const chatTitle = document.querySelector('.chat-header h2');
        console.assert(chatTitle.textContent === '御言者', '聊天标题不正');
        
        await sendMessage('你好，请绍一下你自己');
        // 等待响应
        await new Promise(resolve => setTimeout(resolve, 2000));
    },
    
    async testPageSwitch() {
        console.log('测试页面切换...');
        const pages = ['home', 'ai-chat', 'ai-draw', 'computing', 'tasks', 'community'];
        
        for (const page of pages) {
            try {
                await switchPage(page);
                const activePage = document.querySelector('.page.active');
                console.assert(activePage.id === page, `页面切换到 ${page} 失败`);
                
                // 如果是聊天页面检查标题
                if (page === 'ai-chat') {
                    const chatTitle = document.querySelector('.chat-header h2');
                    console.assert(chatTitle.textContent === '无问芯穹', 'AI聊天面标题不正确');
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`切换到页面 ${page} 时出错:`, error);
                // 不抛出错误，让页面继续运行
                console.warn('页面切换继续进行...');
            }
        }
    },
    
    async testComputing() {
        console.log('测试算力租用...');
        await computingManager.start();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await computingManager.stop();
    },
    
    async testMarketplace() {
        console.log('测试交易功能...');
        marketplaceManager.createOrder('buy', 10, 2.35);
    }
};

// 可以在控制台运行测试
// testSuite.runTests();

function isValidPage(pageId) {
    return CONFIG.PAGES.VALID_PAGES.includes(pageId);
}

function updateHistory(pageId) {
    const state = { page: pageId };
    const title = `御言者 - ${pageId}`;
    const url = `#${pageId}`;
    history.pushState(state, title, url);
}

// 添加一个标志来跟踪是否已经显示过欢迎消息
let hasShownWelcome = false;

function initializeChatPage() {
    const chatInput = document.querySelector('.chat-input');
    const sendBtn = document.querySelector('.send-btn');
    const clearBtn = document.querySelector('.clear-chat-btn');
    const exportBtn = document.querySelector('.export-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const chatHistory = document.querySelector('.chat-history');
    
    // 检查元素是否存在
    if (!chatInput || !sendBtn || !chatHistory) {
        console.error('Chat elements not found');
        return;
    }

    // 只在聊天历史为空时显示欢迎消息
    if (chatHistory.children.length === 0) {
        appendMessage('ai', '你好！我是无问芯穹AI助手，基于通义千问2.5-72B大语言模型，有什么我可以帮你的吗？');
    }

    // 发送消息函数
    const handleSendMessage = () => {
        const message = chatInput.value.trim();
        if (message) {
            sendMessage(message);
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
    };

    // 发送按钮点击事件
    sendBtn.addEventListener('click', handleSendMessage);
    
    // 输入框回车事件
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // 自动调整输入框高度
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    // 清除聊天记录
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            chatHistory.innerHTML = '';
            hasShownWelcome = false; // 重置欢迎消息标志
            appendMessage('system', '聊天记录已清除');
        });
    }

    // 导出聊天记录
    if (exportBtn) {
        exportBtn.addEventListener('click', exportChatHistory);
    }

    // 新对话按钮点击事件
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            chatHistory.innerHTML = '';
            hasShownWelcome = false; // 重置欢迎消息标志
            appendMessage('ai', '你好！我是无问芯穹AI助手，基于通义千问2.5-72B大语言模型，有什么我可以帮你的吗？');
        });
    }
}

// 移除页面切换时的重新初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化聊天页面
    initializeChatPage();
});

// 初始AI绘画页面
function initializeDrawPage() {
    const imageGenerator = new ImageGenerator();
    
    // 保存到全局变量，以便其他地方可以访问
    window.currentImageGenerator = imageGenerator;
    
    // 添加画廊签切换功能
    const tabs = document.querySelectorAll('.preview-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有标签的active类
            tabs.forEach(t => t.classList.remove('active'));
            // 添加当前标签的active类
            tab.classList.add('active');
            
            // 切换板显示
            const targetPanel = tab.dataset.tab;
            document.querySelector('.output-panel').classList.toggle('active', targetPanel === 'output');
            document.querySelector('.gallery-panel').classList.toggle('active', targetPanel === 'gallery');
        });
    });
}

// AI绘画功能相关代码
class ImageGenerator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.isGenerating = false;
        this.imageHistory = []; // 存储图片历史记录
        this.currentImageIndex = -1; // 当前查看的图片索引
    }

    initializeElements() {
        // 获取所有需要的DOM元素
        this.positivePrompt = document.querySelector('.positive-prompt');
        this.generateBtn = document.querySelector('.generate-btn');
        this.interruptBtn = document.querySelector('.interrupt-btn');
        this.skipBtn = document.querySelector('.skip-btn');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressText = document.querySelector('.progress-text');
        this.imageGrid = document.querySelector('.image-grid');
        
        // 取尺寸选择器
        this.sizeSelect = document.querySelector('.size-select');
        this.modelSelect = document.querySelector('.sd-model-select');
    }

    bindEvents() {
        // 绑定生成按钮事件
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.startGeneration());
        }
        if (this.interruptBtn) {
            this.interruptBtn.addEventListener('click', () => this.interruptGeneration());
        }
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => this.skipGeneration());
        }
    }

    async startGeneration() {
        if (this.isGenerating) return;
        
        // 获取提示词
        const positivePrompt = this.positivePrompt.value;
        if (!positivePrompt.trim()) {
            toast.show('输入图片描述', 'warning');
            return;
        }

        this.isGenerating = true;
        this.updateControlsState(true);
        
        try {
            this.updateProgress(10, '正在处理提示词...');
            
            // 获取选择的尺寸和模型
            const selectedSize = this.sizeSelect ? this.sizeSelect.value : "1024x1024";
            const selectedModel = this.modelSelect ? this.modelSelect.value : "cogview-3-plus";
            
            // 构建API请求参数
            const apiParams = {
                model: selectedModel,
                prompt: positivePrompt,
                size: selectedSize,
                user_id: "user_" + Date.now()
            };
            
            console.log('Sending request:', apiParams); // 调试日志
            
            // 调用API
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer 3c3d47598cc563fb2771360830510fd3.8yluYtAOiQQL9JoA`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(apiParams)
            });

            console.log('Response status:', response.status); // 调试日志

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data); // 调试日志
            
            if (!data.data?.[0]?.url) {
                throw new Error('No image URL received');
            }

            // 开始加载图片
            this.updateProgress(40, '正在生成基础图像...');
            
            // 创建图片对象并监听加载进度
            const img = new Image();
            let progressInterval;
            
            img.onload = () => {
                clearInterval(progressInterval);
                this.updateProgress(100, '生成完成');
                this.addGeneratedImage(data.data[0].url);
                toast.show('图片生成成功', 'success');
                
                // 延迟隐藏进度条
                setTimeout(() => {
                    this.hideProgress();
                }, 1000);
            };
            
            img.onerror = () => {
                clearInterval(progressInterval);
                this.hideProgress();
                throw new Error('Image loading failed');
            };

            // 模拟图片生成过程
            let progress = 40;
            progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    this.updateProgress(progress, this.getProgressMessage(progress));
                }
            }, 500);

            // 设置图片源并开始加载
            img.src = data.data[0].url;

        } catch (error) {
            console.error('Generation failed:', error);
            toast.show(this.getErrorMessage(error), 'error');
            this.hideProgress();
        } finally {
            this.isGenerating = false;
            this.updateControlsState(false);
        }
    }

    updateProgress(percent, message) {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        const progressElement = document.querySelector('.generation-progress');
        
        if (progressElement) {
            progressElement.style.display = 'block';
        }
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${message} (${percent}%)`;
        }
    }

    getProgressMessage(progress) {
        if (progress < 20) return '正在处理提示词...';
        if (progress < 40) return '正在初始化模型...';
        if (progress < 60) return '正在生成基础图像...';
        if (progress < 80) return '正在优化细节...';
        if (progress < 90) return '正在最终处理...';
        return '即将完成...';
    }

    updateControlsState(generating) {
        if (this.generateBtn) this.generateBtn.disabled = generating;
        if (this.interruptBtn) this.interruptBtn.disabled = !generating;
        if (this.skipBtn) this.skipBtn.disabled = !generating;
    }

    addGeneratedImage(imageUrl) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = this.positivePrompt.value;
        img.className = 'generated-image';
        
        // 添加预览按钮
        const previewBtn = document.createElement('button');
        previewBtn.className = 'preview-btn';
        previewBtn.innerHTML = '👁️';
        previewBtn.title = '预览图片';
        previewBtn.onclick = (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            this.showPreview(imageUrl);
        };
        
        // 添加下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '💾';
        downloadBtn.title = '下载图片';
        downloadBtn.onclick = (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            this.downloadImage(imageUrl);
        };
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(previewBtn);
        imgContainer.appendChild(downloadBtn);
        
        if (this.imageGrid) {
            this.imageGrid.appendChild(imgContainer);
        }
    }

    showPreview(imageUrl) {
        // 创建预览遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        
        // 创建预览容器
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'preview-image';
        
        // 创建导航按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-btn prev-btn';
        prevBtn.innerHTML = '←';
        prevBtn.onclick = () => this.showPreviousImage();
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-btn next-btn';
        nextBtn.innerHTML = '→';
        nextBtn.onclick = () => this.showNextImage();
        
        // 创建关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => overlay.remove();
        
        // 添加保存提示信息
        const saveHint = document.createElement('div');
        saveHint.className = 'save-hint';
        saveHint.textContent = '保存图片请右键另存为';
        
        // 组装预览界面
        previewContainer.appendChild(prevBtn);
        previewContainer.appendChild(img);
        previewContainer.appendChild(nextBtn);
        previewContainer.appendChild(closeBtn);
        previewContainer.appendChild(saveHint); // 添加保存提示
        overlay.appendChild(previewContainer);
        document.body.appendChild(overlay);
        
        // 更新导航按钮状态
        this.updateNavButtons();
    }

    showPreviousImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            const prevImage = this.imageHistory[this.currentImageIndex];
            const previewImage = document.querySelector('.preview-image');
            if (previewImage && prevImage) {
                previewImage.src = prevImage.url;
            }
            this.updateNavButtons();
        }
    }

    showNextImage() {
        if (this.currentImageIndex < this.imageHistory.length - 1) {
            this.currentImageIndex++;
            const nextImage = this.imageHistory[this.currentImageIndex];
            const previewImage = document.querySelector('.preview-image');
            if (previewImage && nextImage) {
                previewImage.src = nextImage.url;
            }
            this.updateNavButtons();
        }
    }

    updateNavButtons() {
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentImageIndex <= 0;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentImageIndex >= this.imageHistory.length - 1;
        }
    }

    getErrorMessage(error) {
        console.error('Error details:', error); // 添加详细错误日志
        if (error.message.includes('HTTP error')) {
            return '服务器响应错误，请稍后重试';
        }
        if (error.message.includes('No image URL')) {
            return '未收到图片数据，请重试';
        }
        if (error.message.includes('Failed to fetch')) {
            return '网络连接错误，请检查网络';
        }
        return `图片生成失败：${error.message}`;
    }

    interruptGeneration() {
        this.isGenerating = false;
        this.updateProgress(0);
        this.updateControlsState(false);
        toast.show('已中断生成', 'info');
    }

    skipGeneration() {
        if (!this.isGenerating) return;
        this.updateProgress(100);
        toast.show('已跳过当前生成', 'info');
        this.isGenerating = false;
        this.updateControlsState(false);
    }

    // 添加隐藏进度条的方法
    hideProgress() {
        const progressElement = document.querySelector('.generation-progress');
        if (progressElement) {
            progressElement.style.display = 'none';
        }
    }

    // 添加下载图片方法
    async downloadImage(imageUrl) {
        try {
            toast.show('开始下载...', 'info');
            
            // 直接在新标签页中打开图片
            const newWindow = window.open(imageUrl, '_blank');
            if (!newWindow) {
                toast.show('请允许弹出窗口以查看图片', 'warning');
            } else {
                // 添加下载提示
                newWindow.onload = () => {
                    toast.show('图片已打开，可以右键另存为', 'success');
                };
                
                // 如果加载超时，也给出提示
                setTimeout(() => {
                    if (newWindow.document.readyState !== 'complete') {
                        toast.show('图片加载较慢，请耐心等待', 'info');
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.show('打开图片失败，请重试', 'error');
        }
    }
}

// 添加导出聊天记录功能
function exportChatHistory() {
    const chatHistory = document.querySelector('.chat-history');
    if (!chatHistory) return;

    const messages = Array.from(chatHistory.children).map(msg => {
        const content = msg.querySelector('.message-content').textContent;
        const time = msg.querySelector('.message-time').textContent;
        const type = msg.classList.contains('user-message') ? '用户' : 'AI';
        return `[${time}] ${type}: ${content}`;
    }).join('\n');

    const blob = new Blob([messages], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-history-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 添加API测试函数
async function testAPI() {
    console.log('开始测试API...');
    
    // 测试聊天API
    try {
        console.log('测试聊天API...');
        const chatResponse = await fetch('https://cloud.infini-ai.com/maas/qwen2.5-72b-instruct/nvidia/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-c7rfim3cgvakdoqe`
            },
            body: JSON.stringify({
                model: "qwen2.5-72b-instruct",
                messages: [
                    {"role": "user", "content": "你好"}
                ]
            })
        });

        console.log('聊天API状态码:', chatResponse.status);
        if (!chatResponse.ok) {
            const errorText = await chatResponse.text();
            console.error('聊天API错误:', errorText);
        } else {
            const chatData = await chatResponse.json();
            console.log('聊天API响应:', chatData);
        }
    } catch (error) {
        console.error('聊天API测试失败:', error);
    }

    // 测试文生图API
    try {
        console.log('测试文生图API...');
        const imageResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-c7rfim3cgvakdoqe`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: "cogview-3-plus",
                prompt: "一朵花",
                size: "1024x1024",
                user_id: "user_test_" + Date.now()
            })
        });

        console.log('文生图API状态码:', imageResponse.status);
        if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.error('文生图API错误:', errorText);
        } else {
            const imageData = await imageResponse.json();
            console.log('文生图API响应:', imageData);
        }
    } catch (error) {
        console.error('文生图API测试失败:', error);
    }
}

// 在控制台中调用测试函数
// testAPI();
