import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import {
  EditorView,
  highlightSpecialChars,
  keymap,
  ViewUpdate,
  placeholder as placeholderFunc,
} from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { indentOnInput, bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { defaultKeymap, insertNewlineAndIndent, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { PromQLExtension } from '@clavinjune/codemirror-metricsql';
import { baseTheme, promqlHighlighter } from './CMTheme';
import { BASE_API_PREFIX } from '@/utils/constant';

export { PromQLInputWithBuilder } from './PromQLInputWithBuilder';

const promqlExtension = new PromQLExtension();

export interface CMExpressionInputProps {
  url?: string;
  readonly?: boolean;
  headers?: { [index: string]: string };
  value?: string;
  onChange?: (expr?: string) => void;
  executeQuery?: (expr?: string) => void;
  validateTrigger?: string[];
  completeEnabled?: boolean;
  trigger?: ('onBlur' | 'onEnter')[]; // 触发 onChang 的事件
  datasourceValue?: number;
  placeholder?: string | false;
  groupId: number;
}

const ExpressionInput = (
  {
    url = `${BASE_API_PREFIX}/proxy`,
    headers,
    value,
    onChange,
    executeQuery,
    readonly = false,
    validateTrigger = ['onChange', 'onBlur'],
    completeEnabled = true,
    trigger = ['onBlur', 'onEnter'],
    datasourceValue,
    placeholder = 'Input promql to query. Press Shift+Enter for newlines',
    groupId,
  }: CMExpressionInputProps,
  ref,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const executeQueryCallback = useRef(executeQuery);
  const realValue = useRef<string | undefined>(value || '');

  useEffect(() => {
    const defaultHeaders = {
      Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      'busi-group-id': groupId.toString(),
    };
    executeQueryCallback.current = executeQuery;
    promqlExtension
      .activateCompletion(true)
      .activateLinter(true)
      .setComplete(
        completeEnabled
          ? {
              remote: {
                url: datasourceValue ? `${url}/${datasourceValue}` : url,
                fetchFn: (resource, options = {}) => {
                  const params = options.body?.toString();
                  const search = params ? `?${params}` : '';
                  return fetch(resource + search, {
                    method: 'Get',
                    headers: new Headers(
                      headers
                        ? {
                            ...defaultHeaders,
                            ...headers,
                          }
                        : defaultHeaders,
                    ),
                  });
                },
              },
            }
          : undefined,
      );

    // Create or reconfigure the editor.
    const view = viewRef.current;
    if (view === null) {
      // If the editor does not exist yet, create it.
      if (!containerRef.current) {
        throw new Error('expected CodeMirror container element to exist');
      }

      const startState = EditorState.create({
        doc: value,
        extensions: [
          baseTheme,
          highlightSpecialChars(),
          history(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ closeOnBlur: false }),
          highlightSelectionMatches(),
          syntaxHighlighting(promqlHighlighter),
          EditorView.lineWrapping,
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap]),
          placeholderFunc(placeholder === false ? '' : placeholder),
          promqlExtension.asExtension(),
          EditorView.editable.of(!readonly),
          keymap.of([
            {
              key: 'Escape',
              run: (v: EditorView): boolean => {
                v.contentDOM.blur();
                return false;
              },
            },
          ]),
          Prec.highest(
            keymap.of([
              {
                key: 'Enter',
                run: (v: EditorView): boolean => {
                  if (typeof executeQueryCallback.current === 'function') {
                    executeQueryCallback.current(realValue.current);
                  }
                  if (typeof onChange === 'function' && _.includes(trigger, 'onEnter')) {
                    onChange(realValue.current);
                  }
                  return true;
                },
              },
              {
                key: 'Shift-Enter',
                run: insertNewlineAndIndent,
              },
            ]),
          ),
          EditorView.updateListener.of((update: ViewUpdate): void => {
            if (typeof onChange === 'function') {
              const val = update.state.doc.toString();
              if (val !== realValue.current) {
                realValue.current = val;
                if (_.includes(validateTrigger, 'onChange')) {
                  onChange(val);
                }
              }
            }
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: containerRef.current,
      });

      viewRef.current = view;

      if (ref) {
        ref.current = view;
      }

      // view.focus();
    }
  }, [onChange, JSON.stringify(headers), completeEnabled, groupId]);

  useEffect(() => {
    if (realValue.current !== value) {
      const oldValue = realValue.current;
      realValue.current = value || '';
      const view = viewRef.current;
      if (view === null) {
        return;
      }
      view.dispatch(
        view.state.update({
          changes: { from: 0, to: oldValue?.length || 0, insert: value },
        }),
      );
    }
  }, [value]);

  return (
    <div
      className={classNames({ 'ant-input': true, readonly: readonly, 'promql-input': true })}
      onBlur={() => {
        if (typeof onChange === 'function' && _.includes(trigger, 'onBlur')) {
          if (realValue.current !== value) {
            onChange(realValue.current);
          }
        }
      }}
    >
      <div className='input-content' ref={containerRef} />
    </div>
  );
};

export default React.forwardRef(ExpressionInput);
