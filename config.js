const CONFIG = {
    // API配置
    API: {
        CHAT: {
            URL: 'https://cloud.infini-ai.com/maas/qwen2.5-72b-instruct/nvidia/chat/completions',
            KEY: 'sk-c7rfim3cgvakdoqe'
        },
        IMAGE: {
            URL: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
            KEY: '3c3d47598cc563fb2771360830510fd3.8yluYtAOiQQL9JoA'
        }
    },

    // 聊天机器人配置
    CHATBOT: {
        MODEL: 'gpt-3.5-turbo',
        PRESET: {
            GREETING: '你好！我是御言者AI助手，有什么我可以帮你的吗？',
            THINKING: '思考中...',
            ERROR_RESPONSE: '抱歉，出现了一些错误，请稍后重试',
            FAREWELL: '感谢使用御言者AI助手，再见！',
            SYSTEM_PROMPT: '你是一个有用的AI助手。'
        }
    },

    // 安全配置
    SECURITY: {
        STORAGE_PREFIX: 'yyz_',
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'code', 'pre']
    },

    // 性能阈值
    PERFORMANCE: {
        THRESHOLDS: {
            sendMessage: 5000,
            generateImage: 10000,
            pageLoad: 3000
        }
    },

    // 页面配置
    PAGES: {
        DEFAULT: 'home',
        VALID_PAGES: ['home', 'ai-chat', 'ai-draw', 'computing', 'tasks', 'community']
    },

    // 限制配置
    LIMITS: {
        MAX_MESSAGE_LENGTH: 4000,
        MAX_RETRIES: 3,
        RATE_LIMIT: {
            MESSAGES_PER_MINUTE: 20,
            REQUESTS_PER_HOUR: 100
        }
    },

    // 设置
    SETTINGS: {
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        AUTO_SAVE_INTERVAL: 30000
    }
};

// 防止配置被修改
Object.freeze(CONFIG);