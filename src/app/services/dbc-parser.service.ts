import { Injectable } from '@angular/core';
import { DbcDatabase, DbcMessage, DbcNode, DbcSignal, DbcValueDescription } from '../models';

const PSEUDO_MESSAGE_NAME = 'VECTOR__INDEPENDENT_SIG_MSG';
const NO_NODE = 'Vector__XXX';
const EXTENDED_FLAG = 0x80000000;
const EXTENDED_ID_MASK = 0x1fffffff;

const VERSION_RE = /^VERSION\s+"((?:[^"\\]|\\.)*)"/;
const NODES_RE = /^BU_\s*:(.*)$/;
const MESSAGE_RE = /^BO_\s+(\d+)\s+(\w+)\s*:\s*(\d+)\s+(\w+)/;
const SIGNAL_RE =
  /^SG_\s+(\w+)(?:\s+(M|m\d+M?))?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(\s*([^,\s]+)\s*,\s*([^)\s]+)\s*\)\s*\[\s*([^|\s]+)\s*\|\s*([^\]\s]+)\s*\]\s*"((?:[^"\\]|\\.)*)"\s*(.*)$/;
const COMMENT_RE = /^CM_\s+(?:(BU_|BO_|SG_)\s+(\w+)(?:\s+(\w+))?\s+)?"((?:[^"\\]|\\.)*)"\s*;/;
const VALUES_RE = /^VAL_\s+(\d+)\s+(\w+)\s+([\s\S]*);/;
const VALUE_PAIR_RE = /(-?\d+(?:\.\d+)?)\s+"((?:[^"\\]|\\.)*)"/g;
const VALUE_TYPE_RE = /^SIG_VALTYPE_\s+(\d+)\s+(\w+)\s*:\s*([12])\s*;/;
// The NS_ section lists bare keywords such as "CM_"; real statements always have more tokens.
const STATEMENT_START_RE = /^(?:CM_|VAL_|SIG_VALTYPE_)\s+\S/;

@Injectable({ providedIn: 'root' })
export class DbcParserService {
  parse(text: string): DbcDatabase {
    const lines = text.split(/\r?\n/);
    const messages: DbcMessage[] = [];
    const messagesByRawId = new Map<number, DbcMessage>();
    let nodes: DbcNode[] = [];
    let version = '';
    let current: DbcMessage | null = null;

    const findSignal = (rawId: string, name: string): DbcSignal | undefined =>
      messagesByRawId.get(Number(rawId))?.signals.find((signal) => signal.name === name);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('SG_')) {
        const signal = this.parseSignal(line);
        if (signal) {
          current?.signals.push(signal);
        }
      } else if (line.startsWith('BO_')) {
        current = this.parseMessage(line);
        if (current) {
          messages.push(current);
          messagesByRawId.set(current.rawId, current);
        }
      } else if (line.startsWith('BU_')) {
        const names = NODES_RE.exec(line)?.[1];
        if (names !== undefined) {
          nodes = names
            .split(/\s+/)
            .filter((name) => name)
            .map((name) => ({ name, comment: '' }));
        }
      } else if (line.startsWith('VERSION')) {
        version = this.unescape(VERSION_RE.exec(line)?.[1] ?? '');
      } else if (STATEMENT_START_RE.test(line)) {
        const { statement, lastLine } = this.readStatement(lines, i);
        i = lastLine;

        const comment = COMMENT_RE.exec(statement);
        const values = VALUES_RE.exec(statement);
        const valueType = VALUE_TYPE_RE.exec(statement);

        if (comment) {
          const [, kind, first, second, raw] = comment;
          const text = this.unescape(raw);
          if (kind === 'BU_') {
            const node = nodes.find((n) => n.name === first);
            if (node) node.comment = text;
          } else if (kind === 'BO_') {
            const message = messagesByRawId.get(Number(first));
            if (message) message.comment = text;
          } else if (kind === 'SG_') {
            const signal = findSignal(first, second);
            if (signal) signal.comment = text;
          }
        } else if (values) {
          const signal = findSignal(values[1], values[2]);
          if (signal) signal.values = this.parseValues(values[3]);
        } else if (valueType) {
          const signal = findSignal(valueType[1], valueType[2]);
          if (signal) signal.valueType = valueType[3] === '1' ? 'float32' : 'float64';
        }
      }
    }

    messages.sort((a, b) => a.rawId - b.rawId);

    return {
      version,
      nodes,
      messages,
      signalCount: messages.reduce((total, message) => total + message.signals.length, 0),
    };
  }

  /** Reads lines from `start` until the first `;` that is not inside a quoted string. */
  private readStatement(lines: string[], start: number): { statement: string; lastLine: number } {
    let statement = '';
    let inString = false;

    for (let i = start; i < lines.length; i++) {
      const line = i === start ? lines[i].trim() : lines[i];
      statement += i === start ? line : '\n' + line;

      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (inString) {
          if (ch === '\\') c++;
          else if (ch === '"') inString = false;
        } else if (ch === '"') {
          inString = true;
        } else if (ch === ';') {
          return { statement, lastLine: i };
        }
      }
    }

    return { statement, lastLine: lines.length - 1 };
  }

  private parseMessage(line: string): DbcMessage | null {
    const match = MESSAGE_RE.exec(line);
    if (!match) return null;

    const rawId = Number(match[1]);
    const name = match[2];
    const isPseudo = name === PSEUDO_MESSAGE_NAME;
    const isExtended = !isPseudo && rawId >= EXTENDED_FLAG;
    const id = isExtended ? rawId & EXTENDED_ID_MASK : rawId;
    const hex = id.toString(16).toUpperCase().padStart(isExtended ? 8 : 3, '0');

    return {
      rawId,
      id,
      idHex: isPseudo ? '—' : `0x${hex}`,
      isExtended,
      isPseudo,
      name,
      dlc: Number(match[3]),
      sender: match[4] === NO_NODE ? '' : match[4],
      comment: '',
      signals: [],
    };
  }

  private parseSignal(line: string): DbcSignal | null {
    const match = SIGNAL_RE.exec(line);
    if (!match) return null;

    const mux = match[2];

    return {
      name: match[1],
      startBit: Number(match[3]),
      length: Number(match[4]),
      byteOrder: match[5] === '1' ? 'intel' : 'motorola',
      isSigned: match[6] === '-',
      valueType: 'integer',
      factor: Number(match[7]),
      offset: Number(match[8]),
      min: Number(match[9]),
      max: Number(match[10]),
      unit: this.unescape(match[11]),
      receivers: match[12].split(/[\s,]+/).filter((node) => node && node !== NO_NODE),
      multiplexing: !mux ? 'none' : mux === 'M' ? 'multiplexor' : 'multiplexed',
      muxValue: mux && mux !== 'M' ? parseInt(mux.slice(1), 10) : null,
      comment: '',
      values: [],
    };
  }

  private parseValues(body: string): DbcValueDescription[] {
    return [...body.matchAll(VALUE_PAIR_RE)]
      .map((pair) => ({ value: Number(pair[1]), description: this.unescape(pair[2]).trim() }))
      .sort((a, b) => a.value - b.value);
  }

  private unescape(text: string): string {
    return text.replace(/\\(["\\])/g, '$1');
  }
}
