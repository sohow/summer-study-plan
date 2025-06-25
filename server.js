import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 获取当前模块的文件路径和目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ---- 中间件设置 ----
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- 数据存储 ----
const DB_PATH = path.join(__dirname, 'database.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---- 文件上传配置 (Multer) ----
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const date = req.body.date;
        if (!date) {
            return cb(new Error('日期参数不能为空'));
        }
        const uploadPath = path.join(__dirname, 'uploads', date);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${Date.now()}-${req.body.uploadType}-${originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024,
        fieldSize: 2 * 1024 * 1024 * 1024
    }
}).any();

// 设置上传超时为30分钟
app.use((req, res, next) => {
    if (req.method === 'POST' && req.url === '/api/upload') {
        req.setTimeout(30 * 60 * 1000);
        res.setTimeout(30 * 60 * 1000);
    }
    next();
});

// ---- API 路由 ----
// 删除文件API
app.post('/api/delete', (req, res) => {
    try {
        const { date, uploadType } = req.body;
        if (!date || !uploadType) {
            return res.status(400).json({ message: '缺少必要参数' });
        }

        const db = readDB();
        
        // 初始化不存在的日期数据
        if (!db[date]) {
            db[date] = { score: 0, items: {} };
        }

        if (!db[date].items || !db[date].items[uploadType]) {
            return res.status(404).json({ message: '未找到要删除的记录' });
        }

        // 删除文件
        db[date].items[uploadType].forEach(file => {
            try {
                const filePath = path.join(__dirname, file.path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileError) {
                console.error('删除文件失败:', fileError);
            }
        });

        // 更新数据库
        delete db[date].items[uploadType];
        db[date].score = Object.keys(db[date].items).filter(k => db[date].items[k]).length;
        writeDB(db);

        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除操作失败:', error);
        res.status(500).json({ message: `删除失败: ${error.message}` });
    }
});

// GET: 获取所有打卡数据
app.get('/api/data', (req, res) => {
    const db = readDB();
    res.json(db);
});

// POST: 处理文件上传
app.post('/api/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `文件上传错误: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ message: `未知服务器错误: ${err.message}` });
        }

        const { date, uploadType } = req.body;
        const files = req.files;

        // 验证date参数
        if (!date) {
            return res.status(400).json({ message: '日期参数不能为空' });
        }

        const today = new Date().toISOString().split('T')[0];
        if (date !== today) {
            return res.status(403).json({ message: '只能在当天进行上传！' });
        }

        // 其他校验逻辑保持不变...

        const db = readDB();
        if (!db[date]) {
            db[date] = { score: 0, items: {} };
        }
        if (!db[date].items) {
            db[date].items = {};
        }

        if (!db[date].items[uploadType]) {
            db[date].score += 1;
        }

        db[date].items[uploadType] = files.map(file => ({
            path: `/uploads/${date}/${file.filename}`,
            name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            type: file.mimetype
        }));

        writeDB(db);
        res.json({ message: '上传成功!', data: db[date] });
    })
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});