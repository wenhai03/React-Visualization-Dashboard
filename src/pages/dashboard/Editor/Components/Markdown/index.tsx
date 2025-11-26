import React from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Link } from 'react-router-dom';
import { isAbsolutePath } from '@/pages/dashboard/utils';

import './index.less';
interface IMarkDownPros {
  content: string;
  style?: any;
}

// https://github.com/vitejs/vite/issues/3592 bug solve 记录
const Markdown: React.FC<IMarkDownPros> = ({ content, style = {} }) => {
  return (
    <div className='markdown-wrapper' style={style}>
      <ReactMarkdown
        remarkPlugins={[gfm]}
        children={content}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              {...props}
              style={{
                color: style.color,
                ...props.style,
              }}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              {...props}
              style={{
                color: style.color,
                ...props.style,
              }}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              {...props}
              style={{
                color: style.color,
                ...props.style,
              }}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              {...props}
              style={{
                color: style.color,
                ...props.style,
              }}
            />
          ),
          h5: ({ node, ...props }) => (
            <h5
              {...props}
              style={{
                color: style.color,
                ...props.style,
              }}
            />
          ),
          h6: ({ node, ...props }) => (
            <h6
              {...props}
              style={{
                color: style.color,
                ...props.style,
              }}
            />
          ),
          a: ({ href, children }: any) => {
            // 链接绝对路径，外链打开
            if (isAbsolutePath(href)) {
              return (
                <a href={href} target='_blank' rel='noopener noreferrer'>
                  {children}
                </a>
              );
            } else {
              return <Link to={href}>{children}</Link>;
            }
          },
        }}
      />
    </div>
  );
};

export default Markdown;
