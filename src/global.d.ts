/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
interface window {
  '&': any;
  JQuery: {
    daterangepicker: Function;
  };
}
declare module '*.md' {
  const content: any;
  export default content;
}

declare module '*.peggy' {
  export interface ParserOptions {
    [key: string]: any;
    /**
     * Object that will be attached to the each `LocationRange` object created by
     * the parser. For example, this can be path to the parsed file or even the
     * File object.
     */
    grammarSource?: any;
    startRule?: string;
    tracer?: ParserTracer;
  }

  /**
   * parse `input` using the peggy grammer
   * @param input code to parse
   * @param options parse options
   */
  export function parse(input: string, options?: ParserOptions): any;
}
