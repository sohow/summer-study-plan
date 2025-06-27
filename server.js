import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
    fileURLToPath
} from 'url';
import session from 'express-session';
import bcrypt from 'bcrypt';
import 'dotenv/config'; // 用于加载 .env 文件
import { TASKS_CONFIG as TASKS } from './public/tasks.js'; // 导入任务配置

// 获取当前模块的文件路径和目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- 环境变量和密码 ----
// 从 .env 文件加载密码哈希和Session密钥以保证安全
const PASSWORD_HASH = process.env.PASSWORD_HASH;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!PASSWORD_HASH || !SESSION_SECRET) {
    console.error("错误：请在项目根目录创建 .env 文件，并设置 PASSWORD_HASH 和 SESSION_SECRET 环境变量。");
    console.log("提示：你可以运行 'node hash-password.js' 脚本来生成密码的哈希值。");
    process.exit(1); // 缺少关键配置，退出程序
}

const app = express();
const PORT = 3000;

// ---- 核心中间件 ----
// Session 中间件配置
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 在生产环境中应使用 secure cookie
        httpOnly: true, // 防止客户端JS访问cookie
        maxAge: 24 * 60 * 60 * 1000 // session有效期24小时
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function calculateScore(dayItems) {
    if (!dayItems) return 0;
    let score = 0;
    TASKS.forEach(task => {
        const isComplete = task.subTasks
            ? task.subTasks.some(sub => dayItems[sub.id] && dayItems[sub.id].length > 0)
            : dayItems[task.id] && dayItems[task.id].length > 0;
        if (isComplete) {
            score++;
        }
    });
    return score;
}

// ---- 数据存储 ----
const DB_PATH = path.join(__dirname, 'database.json');

async function readDB() {
    try {
        await fs.access(DB_PATH);
    } catch {
        // 如果文件不存在，则创建一个空对象文件
        await fs.writeFile(DB_PATH, JSON.stringify({}));
    }
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
}

async function writeDB(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

const decodeOriginalName = (originalname) => Buffer.from(originalname, 'latin1').toString('utf8');

// ---- 文件上传配置 (Multer) ----
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const date = req.body.date;
        if (!date) {
            // 传递错误给 multer
            return cb(new Error('日期参数不能为空'), null);
        }
        // 安全性校验：确保date是 YYYY-MM-DD 格式
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return cb(new Error('日期格式不合法'));
        }
        const uploadPath = path.join(__dirname, 'uploads', date);
        // 使用异步mkdir，并让它在已存在时也不报错
        fs.mkdir(uploadPath, { recursive: true }).then(() => cb(null, uploadPath)).catch(cb);
    },
    filename: function (req, file, cb) {
        const originalname = decodeOriginalName(file.originalname);
        cb(null, `${Date.now()}-${req.body.uploadType}-${originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 设置单个文件大小上限为 2GB
    },
}).any();

// ---- 静态文件服务 ----
// 静态文件（如login.html, css, js）会由这个中间件处理
app.use(express.static(path.join(__dirname, 'public')));

// ---- 认证中间件 ----
const requireAuth = (req, res, next) => {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ message: '未授权，请先登录' });
    }
};

// ---- 自定义中间件 ----
const thirtyMinTimeout = (req, res, next) => {
    // 为特定路由设置上传超时为30分钟
    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);
    next();
};

// ---- API 路由 ----

// POST: 登录
app.post('/api/login', async (req, res) => {
    // 增加用户名校验，以匹配前端login.html并提高安全性
    const { username, password } = req.body;
    const expectedUsername = process.env.USERNAME || 'admin'; // 允许通过.env配置用户名，默认为'admin'

    if (!username || !password) {
        return res.status(400).json({ message: '请输入用户名和密码' });
    }

    try {
        const isPasswordCorrect = await bcrypt.compare(password, PASSWORD_HASH);

        if (username === expectedUsername && isPasswordCorrect) {
            req.session.isAuthenticated = true; // 在 session 中标记为已认证
            res.json({ message: '登录成功' });
        } else {
            res.status(401).json({ message: '用户名或密码错误' });
        }
    } catch (error) {
        console.error('登录验证失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// POST: 登出
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: '登出失败' });
        }
        res.clearCookie('connect.sid'); // connect.sid 是 express-session 默认的 cookie 名称
        res.json({ message: '登出成功' });
    });
});

// GET: 检查认证状态
app.get('/api/check-auth', (req, res) => {
    res.json({
        isAuthenticated: !!req.session.isAuthenticated
    });
});

// 删除文件API
app.post('/api/delete', requireAuth, async (req, res) => {
    try {
        const { date, uploadType, filePath } = req.body;
        if (!date || !uploadType || !filePath) {
            return res.status(400).json({ message: '缺少必要参数' });
        }
        // 安全性校验：确保date是 YYYY-MM-DD 格式
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: '日期格式不合法' });
        }

        const db = await readDB();
        const dayData = db[date];
        if (!dayData || !dayData.items || !Array.isArray(dayData.items[uploadType])) {
            return res.status(404).json({ message: '未找到要删除的记录' });
        }

        const files = dayData.items[uploadType];

        // 验证：如果删除的是最后一个题目文档，必须先清空对应的讲解视频
        if (uploadType.endsWith('-doc')) {
            const videoType = uploadType.replace('-doc', '-video');
            const videoFiles = dayData.items[videoType] || [];
            if (files.length === 1 && videoFiles.length > 0) {
                return res.status(400).json({ message: '清空题目文件前，请先删除对应的讲解视频。' });
            }
        }

        const fileToDelete = files.find(f => f.path === filePath);
        if (!fileToDelete) {
            return res.status(404).json({ message: '未找到要删除的文件' });
        }

        // 删除物理文件
        const fullPath = path.join(__dirname, filePath);
        await fs.unlink(fullPath).catch(err => {
            if (err.code !== 'ENOENT') { // ENOENT: Error NO ENTity (file not found)
                console.error(`删除文件失败: ${fullPath}`, err);
            }
        });

        // 如果是视频文件，并且有对应的缩略图，则删除缩略图
        if (fileToDelete.thumbnailPath) {
            const thumbnailFullPath = path.join(__dirname, fileToDelete.thumbnailPath);
            await fs.unlink(thumbnailFullPath).catch(err => {
                if (err.code !== 'ENOENT') {
                    console.error(`删除缩略图文件失败: ${thumbnailFullPath}`, err);
                }
            });
        }

        // 更新数据库
        const updatedFiles = files.filter(f => f.path !== filePath);
        db[date].items[uploadType] = updatedFiles;
        // 如果该类型下没有文件了，则从items中删除该键
        if (updatedFiles.length === 0) {
            delete db[date].items[uploadType];
        }
        db[date].score = calculateScore(db[date].items);
        await writeDB(db);

        res.json({ message: '删除成功', data: db[date] }); // 返回更新后的日期数据
    } catch (error) {
        console.error('删除操作失败:', error);
        res.status(500).json({ message: `服务器内部错误: ${error.message}` });
    }
});

// GET: 获取所有打卡数据
app.get('/api/data', requireAuth, async (req, res) => {
    try {
        const db = await readDB();
        res.json(db);
    } catch (error) {
        console.error('获取数据失败:', error);
        res.status(500).json({ message: `获取数据失败: ${error.message}` });
    }
});

// POST: 处理文件上传
app.post('/api/upload', thirtyMinTimeout, requireAuth, (req, res) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `文件上传错误: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ message: `上传预处理失败: ${err.message}` });
        }

        const { date, uploadType } = req.body;
        const files = req.files; // 包含所有上传的文件，包括视频和缩略图

        // 验证date参数
        if (!date) {
            return res.status(400).json({ message: '日期参数不能为空' });
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            if (date !== today) {
                return res.status(403).json({ message: '只能在当天进行上传！' });
            }

            const db = await readDB();

            // 验证：上传视频前必须先上传题目
            if (uploadType.endsWith('-task-video')) {
                const docType = uploadType.replace('-video', '-doc');
                const docFiles = db[date]?.items?.[docType] || [];
                if (docFiles.length === 0) {
                    // 如果验证失败，删除已上传的临时文件
                    const deletePromises = files.map(file => fs.unlink(file.path).catch(err => { /* console.error(`Failed to delete temp file: ${file.path}`, err) */ }));
                    await Promise.all(deletePromises);
                    return res.status(400).json({ message: '先上传题目图片或PDF，再上传讲解视频' });
                }
            }

            // 分离主文件和缩略图文件
            const thumbnails = files.filter(f => f.fieldname.endsWith('_thumbnail'));
            const mainFiles = files.filter(f => !f.fieldname.endsWith('_thumbnail'));

            if (!db[date]) {
                db[date] = { score: 0, items: {} };
            }
            if (!db[date].items) {
                db[date].items = {};
            }
            const existingFiles = db[date].items[uploadType] || [];            

            if (existingFiles.length + mainFiles.length > 10) {
                // 如果超出限制，删除已上传的临时文件
                const deletePromises = files.map(file => fs.unlink(file.path).catch(err => { /* console.error(`Failed to delete temp file: ${file.path}`, err) */ }));
                await Promise.all(deletePromises);
                return res.status(400).json({ message: `每个项目最多只能上传10个文件。您已上传 ${existingFiles.length} 个，本次尝试上传 ${mainFiles.length} 个。` });
            }

            // 将缩略图移动到专用目录
            const thumbnailDir = path.join(__dirname, 'uploads', 'thumbnails', date);
            await fs.mkdir(thumbnailDir, { recursive: true });
            for (const thumb of thumbnails) {
                const newPath = path.join(thumbnailDir, thumb.filename);
                await fs.rename(thumb.path, newPath);
                // 更新缩略图对象中的路径信息，以便后续查找
                thumb.newPath = `uploads/thumbnails/${date}/${thumb.filename}`;
            }

            // 创建一个从原始字段名到缩略图路径的映射
            const thumbnailMap = thumbnails.reduce((acc, thumb) => {
                const originalFieldname = thumb.fieldname.replace('_thumbnail', '');
                acc[originalFieldname] = thumb.newPath;
                return acc;
            }, {});

            // 准备要存入数据库的新文件记录
            const newFiles = mainFiles.map(file => ({
                path: `uploads/${date}/${file.filename}`,
                name: decodeOriginalName(file.originalname),
                type: file.mimetype,
                thumbnailPath: thumbnailMap[file.fieldname] || null // 添加缩略图路径
            }));

            if (!db[date].items[uploadType]) {
                db[date].items[uploadType] = [];
            }
            db[date].items[uploadType].push(...newFiles);
            db[date].score = calculateScore(db[date].items);
            await writeDB(db);
            res.json({ message: '上传成功!', data: db[date] });
        } catch (error) {
            console.error('上传处理失败:', error);
            res.status(500).json({ message: `上传处理失败: ${error.message}` });
        }
    })
});

// GET: 受保护的缩略图文件访问路由
app.get('/uploads/thumbnails/:date/:filename', requireAuth, (req, res) => {
    const { date, filename } = req.params;
    // 基本验证以防止路径遍历攻击
    if (date.includes('..') || filename.includes('..') || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).send('无效的路径或日期格式');
    }
    const filePath = path.join(__dirname, 'uploads', 'thumbnails', date, filename);

    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath, (err) => {
        if (err) {
            if (res.headersSent) {
                if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
                    return; // Client disconnected, do nothing.
                }
                console.error(`服务缩略图 ${filePath} 时出错 (headers already sent, code: ${err.code}):`, err);
            } else {
                console.error(`服务缩略图 ${filePath} 时出错:`, err);
                res.status(err.code === 'ENOENT' ? 404 : 500).send(err.code === 'ENOENT' ? '文件未找到' : '服务文件时出错');
            }
        }
    });
});

// GET: 受保护的上传文件访问路由
// 只有认证用户才能访问 /uploads 路径下的文件
app.get('/uploads/:date/:filename', requireAuth, (req, res) => {
    const { date, filename } = req.params;
    // 基本验证以防止路径遍历攻击，并确保日期格式正确
    if (date.includes('..') || filename.includes('..') || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).send('无效的路径或日期格式');
    }
    const filePath = path.join(__dirname, 'uploads', date, filename);

    // 设置 Content-Disposition 为 inline，以便浏览器直接显示文件
    res.setHeader('Content-Disposition', 'inline');

    res.sendFile(filePath, (err) => {
        if (err) {
            // 检查响应头是否已发送。如果在流式传输文件期间发生错误，
            // 响应头可能已经发出，此时不能再发送新的响应。
            if (res.headersSent) {
                // 如果是客户端断开连接导致的 EPIPE 或 ECONNRESET 错误，
                // 这种情况下无法向客户端发送任何响应，只需记录并忽略。
                if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
                    //console.warn(`客户端在文件传输过程中断开连接: ${filePath}. 错误: ${err.message}`);
                    return; // 明确返回，不再尝试发送任何响应
                }
                console.error(`服务文件 ${filePath} 时出错 (headers already sent, code: ${err.code}):`, err);
            } else {
                console.error(`服务文件 ${filePath} 时出错:`, err);
                res.status(err.code === 'ENOENT' ? 404 : 500).send(err.code === 'ENOENT' ? '文件未找到' : '服务文件时出错');
            }
        }
    });
});

// ---- SPA Fallback ----
// 对于所有未被API路由和静态文件处理的GET请求，进行服务器端认证检查。
// 这个处理器必须放在所有其他路由和静态文件服务之后。
app.get('/*path', (req, res) => {
    // 忽略所有API请求
    if (req.path.startsWith('/api/')) {
        return res.status(404).send('Not Found');
    }

    // 检查请求路径是否包含文件扩展名。如果是，则假定它是一个静态资源请求。
    // 由于 express.static 中间件在前，如果这个请求还能到达这里，
    // 说明文件未找到。因此，我们应该返回 404，而不是重定向或发送 index.html。
    if (path.extname(req.path)) {
        return res.status(404).send('Not Found');
    }

    // 对于没有扩展名的页面路由（如 '/', '/dashboard' 等）:
    // 如果用户未认证，则重定向到登录页。
    if (!req.session.isAuthenticated) {
        return res.redirect('/login.html');
    }
    // 如果用户已认证，则提供单页应用的主入口文件。
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
     console.log(`服务器运行在 http://localhost:${PORT}`);
});