import React, { useEffect, useRef } from 'react';
import { Modal } from 'antd';
import { Terminal } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import { FitAddon } from 'xterm-addon-fit';
import COMMANDS from '@/utils/vrl';
import { BASE_API_PREFIX } from '@/utils/constant';
import '@xterm/xterm/css/xterm.css';
import './index.less';

const PROMPT = '\x1B[32m#\x1B[0m ';

// ANSI 转义序列过滤器
const stripAnsi = (str: string) => str.replace(/\x1B\[[\d;]*m/g, '');

// 构造 WebSocket URL
const getWebSocketUrl = () => {
  const token = localStorage.getItem('access_token');
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${protocol}://${host}${BASE_API_PREFIX}/vector/vrl?token=${token}`;
};

const WebTerminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddon = useRef(new FitAddon());
  // 输入缓冲区和光标位置
  const inputBuffer = useRef<string[]>([]);
  const cursorPos = useRef<number>(0);
  const terminal = useRef<Terminal | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const sendQueue = useRef<string[]>([]);
  const suggestionBuffer = useRef<string>('');
  const historyCommands = useRef<string[]>([]);
  const historyIndex = useRef(-1); // -1表示不在历史记录模式
  const currentInputBeforeHistory = useRef<string[]>([]); // 保存进入历史记录前的输入

  // 初始化 WebSocket 连接
  const initWebSocket = () => {
    Modal.destroyAll()
    ws.current = new WebSocket(getWebSocketUrl());

    ws.current.onopen = () => {
      sendQueue.current.forEach((data) => ws.current?.send(data));
    };

    ws.current.onmessage = (event) => {
      terminal.current?.write(event.data + `\r\n${PROMPT}`);
    };

    ws.current.onclose = (event) => {
      Modal.info({
        width: 500,
        icon: null,
        title: '连接已断开',
        closable: false,
        centered: true,
        className: 'connection-closed',
      });
    };

    ws.current.onerror = (error) => {
      terminal.current?.write('Connection failed, retrying...\r\n');
      setTimeout(initWebSocket, 5000);
    };
  };

  const sendData = (data: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // 直接发送数据
      ws.current.send(data);
    } else {
      // 连接未就绪时缓存数据
      sendQueue.current.push(data);
    }
  };

  const getStringWidth = (text: string) => {
    return [...text].reduce((width, char) => {
      return width + (char.match(/[\u4e00-\u9fa5]/) ? 2 : 1); // 中文字符占2格
    }, 0);
  };

  const getCharWidth = (char: string) => {
    const code = char.charCodeAt(0);
    return (code >= 0x4e00 && code <= 0x9fff) || // 中文
      (code >= 0xff00 && code <= 0xffef) // 全角符号
      ? 2
      : 1;
  };

  const renderInput = () => {
    if (!terminal.current || !terminalRef.current) return;
    terminal.current?.write(`\x1B[2K\r${PROMPT}${inputBuffer.current.join('')}`);
    if (suggestionBuffer.current) {
      terminal.current?.write(`\x1B[7m${suggestionBuffer.current}\x1B[0m`);
    }

    // 计算实际光标目标位置
    const promptWidth = getStringWidth(stripAnsi(PROMPT));
    const cleanInput = inputBuffer.current.map(stripAnsi);
    const inputBeforeCursor = cleanInput.slice(0, cursorPos.current);
    const inputWidth = inputBeforeCursor.reduce((sum, char) => sum + getCharWidth(char), 0);
    const totalColumns = promptWidth + inputWidth;

    // 使用绝对列坐标定位光标
    terminal.current?.write(`\x1B[${totalColumns + 1}G`); // +1 因为终端列从1开始
  };

  const updateSuggestion = () => {
    const currentInput = inputBuffer.current.join('');
    if (!currentInput) {
      suggestionBuffer.current = '';
      renderInput();
      return;
    }

    const match = COMMANDS.find((cmd) => cmd.startsWith(currentInput) && cmd !== currentInput);
    suggestionBuffer.current = match ? match.slice(currentInput.length) : '';
    renderInput();
  };

  const handleInput = () => {
    terminal.current?.onData((data) => {
      // 判断粘贴操作的条件：数据长度 >1 且不包含控制序列
      if (data.length > 1 && !data.startsWith('\x1B')) {
        // 过滤 ANSI 转义码和控制字符
        const cleanedData = stripAnsi(data)
          .replace(/[\r\n]/g, '')
          .replace(/[\x00-\x1F]/g, '');

        // 分割 Unicode 字符（如中文）
        const validChars = [...cleanedData].filter((c) => {
          const code = c.charCodeAt(0);
          return code >= 32 && !(code >= 127 && code <= 159);
        });

        // 插入字符并更新光标
        inputBuffer.current.splice(cursorPos.current, 0, ...validChars);
        cursorPos.current += validChars.length;

        // 统一渲染和光标定位
        updateSuggestion();
        renderInput();
        return; // 跳过后续单个字符处理
      }
      const charCode = data.charCodeAt(0);
      if (charCode >= 32 && charCode <= 126) {
        // 插入字符
        inputBuffer.current.splice(cursorPos.current, 0, data);
        cursorPos.current++;
        updateSuggestion();
      } else if (charCode === 127) {
        // 退格
        if (cursorPos.current > 0) {
          inputBuffer.current.splice(cursorPos.current - 1, 1);
          cursorPos.current--;
          updateSuggestion();
        }
      } else if (charCode === 13) {
        // 回车
        const command = inputBuffer.current.join('').trim();
        if (command) {
          terminal.current?.write('\r\n');
          if (command === 'exit') {
            // 如果输入 'exit'，关闭 WebSocket 连接
            terminal.current?.write('\r\nExiting...\r\n');
            terminal.current?.write('# Connection closed.\r\n');
            ws.current?.close(); // 断开 WebSocket 连接
            return; // 停止继续处理命令
          }
          if (historyCommands.current[0] !== command) {
            historyCommands.current.unshift(command);
            // 只保留最多10条记录
            if (historyCommands.current.length > 10) {
              historyCommands.current.pop();
            }
          }
        } else {
          terminal.current?.write('\r\n');
          terminal.current?.write(PROMPT);
        }
        sendData(command);
        inputBuffer.current = [];
        suggestionBuffer.current = '';
        cursorPos.current = 0;
        historyIndex.current = -1; // 重置历史索引
      } else if (data === '\x1B[D') {
        // 左箭头
        if (cursorPos.current > 0) {
          cursorPos.current--;
          renderInput(); // 根据实际宽度重新定位
        }
      } else if (data === '\x1B[C') {
        // 右箭头
        if (suggestionBuffer.current) {
          // 右箭头自动填充建议
          suggestionBuffer.current.split('').forEach((char) => {
            inputBuffer.current.splice(cursorPos.current, 0, char);
            cursorPos.current++;
          });
          suggestionBuffer.current = '';
          renderInput();
        } else if (cursorPos.current < inputBuffer.current.length) {
          cursorPos.current++;
          renderInput(); // 通过统一渲染更新光标位置
        }
      } else if (data === '\x1B[A') {
        // 上箭头
        if (historyCommands.current.length > 0) {
          if (historyIndex.current === -1) {
            // 保存当前未提交的输入
            currentInputBeforeHistory.current = [...inputBuffer.current];
          }

          if (historyIndex.current < historyCommands.current.length - 1) {
            historyIndex.current++;
            const historyCommand = historyCommands.current[historyIndex.current];
            inputBuffer.current = historyCommand.split('');
            cursorPos.current = inputBuffer.current.length;
            renderInput();
          }
        }
      } else if (data === '\x1B[B') {
        // 下箭头
        if (historyIndex.current >= 0) {
          historyIndex.current--;

          if (historyIndex.current === -1) {
            // 恢复之前未提交的输入
            inputBuffer.current = [...currentInputBeforeHistory.current];
          } else {
            const historyCommand = historyCommands.current[historyIndex.current];
            inputBuffer.current = historyCommand.split('');
          }

          cursorPos.current = inputBuffer.current.length;
          renderInput();
        }
      }
    });
  };

  const handlePaste = (text: string) => {
    updateSuggestion();
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. 初始化终端
    terminal.current = new Terminal({
      convertEol: true, // 自动转换 \n → \r\n
      cursorBlink: true,
      allowProposedApi: true,
      disableStdin: false,
      cursorStyle: 'bar', // 将光标设置为竖线
      cursorWidth: 1, // 设置光标宽度
      fontFamily:
        '"Consolas", "Cascadia Mono",  "Menlo", "Monaco","DejaVu Sans Mono", "Ubuntu Mono", "Courier New", "Liberation Mono","Source Code Pro", "Fira Code", monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      },
    });

    // 启用 WebGL 加速渲染
    const webglAddon = new WebglAddon();
    terminal.current.loadAddon(webglAddon);

    // 加载插件
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.open(terminalRef.current!);
    fitAddon.current.fit();

    // 自定义键盘事件处理（复制粘贴）
    terminal.current.attachCustomKeyEventHandler((e) => {
      const isModifier = e.ctrlKey || e.metaKey;

      // Ctrl+C / Cmd+C 复制选中文本
      if (isModifier && e.code === 'KeyC' && terminal.current?.hasSelection()) {
        const selection = terminal.current.getSelection();
        navigator.clipboard?.writeText(selection).catch(() => {
          // 降级方案
          const textarea = document.createElement('textarea');
          textarea.value = selection;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        });
        return false;
      }

      // Ctrl+V / Cmd+V 粘贴
      if (isModifier && e.code === 'KeyV') {
        navigator.clipboard
          ?.readText()
          .then((text) => {
            handlePaste(text);
          })
          .catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.focus();
            if (document.execCommand('paste')) {
              handlePaste(textarea.value);
            }
            document.body.removeChild(textarea);
          });
        return false;
      }

      return true;
    });

    const compositionStartHandler = () => {
      // 开始输入中文，暂时禁用终端输入
      terminal.current!.options.disableStdin = true;
    };
    const compositionEndHandler = (event) => {
      terminal.current!.options.disableStdin = false;

      const inputText = event.data;
      inputBuffer.current.splice(cursorPos.current, 0, ...inputText.split(''));
      cursorPos.current += inputText.length;
      renderInput();
    };

    // 监听输入法事件
    terminalRef.current.addEventListener('compositionstart', compositionStartHandler);

    terminalRef.current.addEventListener('compositionend', compositionEndHandler);

    // 初始化 WebSocket
    initWebSocket();

    // 初始化输入提示
    handleInput();

    // 窗口尺寸变化处理
    const resizeHandler = () => {
      fitAddon.current.fit();
    };

    const resizeObserver = new ResizeObserver(resizeHandler);
    resizeObserver.observe(terminalRef.current!);

    // 清理函数
    return () => {
      terminal.current?.dispose();
      ws.current?.close();
      resizeObserver.disconnect();
      terminalRef.current?.removeEventListener('compositionstart', compositionStartHandler);
      terminalRef.current?.removeEventListener('compositionend', compositionEndHandler);
    };
  }, []);

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default WebTerminal;
