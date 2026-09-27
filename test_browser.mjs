// 启动简单的 HTTP 服务器，用于测试状态栏 HTML 是否能正常渲染
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 7777;
const HTML_PATH = 'src/欲妈群/正则/状态栏.html';

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.url === '/' || req.url === '/test') {
    const html = fs.readFileSync(HTML_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`测试服务器已启动: http://localhost:${PORT}/`);
  console.log(`加载 HTML: ${HTML_PATH}`);
  console.log(`文件大小: ${fs.statSync(HTML_PATH).size} 字节`);
  console.log('请在浏览器中打开 http://localhost:' + PORT + '/ 查看状态栏渲染效果');
  console.log('按 Ctrl+C 停止服务器');
});
