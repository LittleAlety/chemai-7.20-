#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ChemAI 语料库云端接收端 · 参考实现
==================================

配套 app/corpus.html「云端同步」面板使用。仅依赖 Python 标准库，自带 CORS 支持。

用法：
    python3 scripts/corpus-server.py [端口]      # 默认 8765

接口：
    POST /api/corpus     接收 {"entries": [...]}，按 id 合并去重后持久化到
                         本脚本同目录的 cloud_corpus.json，返回 {"ok":true,"received":N,"total":M}
    GET  /api/corpus     查看云端已接收的语料（JSON）
    GET  /api/health     健康检查，返回 {"ok":true}
"""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(BASE_DIR, 'cloud_corpus.json')


def load_store():
    try:
        with open(STORE, encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_store(entries):
    tmp = STORE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STORE)


class Handler(BaseHTTPRequestHandler):
    server_version = 'ChemAI-Corpus-Server/1.0'

    # ---------- helpers ----------
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # 简化日志
        sys.stderr.write('[%s] %s\n' % (time.strftime('%H:%M:%S'), fmt % args))

    # ---------- methods ----------
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/health':
            return self._json(200, {'ok': True})
        if self.path == '/api/corpus':
            entries = load_store()
            return self._json(200, {'ok': True, 'total': len(entries), 'entries': entries})
        self._json(404, {'ok': False, 'error': 'not found'})

    def do_POST(self):
        if self.path != '/api/corpus':
            return self._json(404, {'ok': False, 'error': 'not found'})
        try:
            length = int(self.headers.get('Content-Length') or 0)
            payload = json.loads(self.rfile.read(length).decode('utf-8') or '{}')
            entries = payload.get('entries')
            if not isinstance(entries, list):
                raise ValueError('body 必须是 {"entries": [...]}')
        except Exception as e:
            return self._json(400, {'ok': False, 'error': '请求解析失败: %s' % e})

        store = load_store()
        by_id = {str(e.get('id')): e for e in store if isinstance(e, dict)}
        for e in entries:
            if isinstance(e, dict) and e.get('id') is not None:
                by_id[str(e['id'])] = e          # 同 id 覆盖（幂等）
        merged = sorted(by_id.values(), key=lambda e: e.get('id', 0))
        save_store(merged)
        self._json(200, {'ok': True, 'received': len(entries), 'total': len(merged)})


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print('ChemAI 语料云端接收端 · 监听 http://0.0.0.0:%d/api/corpus （存储 %s）' % (port, STORE))
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
