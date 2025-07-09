/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'papaparse' {
  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult, parser: Parser) => void;
    complete?: (results: ParseResult, file: File) => void;
    error?: (error: Error) => void;
    download?: boolean;
    skipEmptyLines?: boolean;
    chunk?: (results: ParseResult, parser: Parser) => void;
    fastMode?: boolean;
    beforeFirstChunk?: (chunk: string) => string | void;
    withCredentials?: boolean;
    transform?: (value: string) => string;
  }

  export interface UnparseConfig {
    quotes?: boolean | boolean[];
    quoteChar?: string;
    escapeChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
  }

  export interface ParseResult {
    data: any[];
    errors: Array<{
      type: string;
      code: string;
      message: string;
      row: number;
    }>;
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
    };
  }

  export interface Parser {
    abort: () => void;
    parse: (input: string) => void;
  }

  export function parse(input: string, config?: ParseConfig): ParseResult;
  export function parse(input: File, config?: ParseConfig): ParseResult;

  export function unparse(data: any[] | object[], config?: UnparseConfig): string;
} 