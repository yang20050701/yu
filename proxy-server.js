const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 文生图代理接口
app.post('/api/generate-image', async (req, res) => {
    try {
        const { query, style } = req.body;
        
        // 调用天启API
        const response = await axios.post('https://tianqi.aminer.cn/api/v2/cogview', {
            query,
            style: style || "高清摄影",
            apikey: process.env.TIANQI_API_KEY,
            apisecret: process.env.TIANQI_API_SECRET
        });

        res.json(response.data);
    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取任务状态的代理接口
app.get('/api/task-status/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const response = await axios.get(`https://tianqi.aminer.cn/api/v2/cogview/status/${taskId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Task status error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
}); 