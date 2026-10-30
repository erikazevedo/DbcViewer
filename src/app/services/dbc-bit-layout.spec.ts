import { DbcMessage, DbcSignal } from '../models';
import { buildBitLayout, signalBits } from './dbc-bit-layout';

function signal(overrides: Partial<DbcSignal>): DbcSignal {
  return {
    name: 'S',
    startBit: 0,
    length: 8,
    byteOrder: 'intel',
    isSigned: false,
    valueType: 'integer',
    factor: 1,
    offset: 0,
    min: 0,
    max: 0,
    unit: '',
    receivers: [],
    multiplexing: 'none',
    muxValue: null,
    comment: '',
    values: [],
    ...overrides,
  };
}

function message(dlc: number, signals: DbcSignal[]): DbcMessage {
  return {
    rawId: 1,
    id: 1,
    idHex: '0x001',
    isExtended: false,
    isPseudo: false,
    name: 'M',
    dlc,
    sender: '',
    comment: '',
    signals,
  };
}

describe('signalBits', () => {
  it('counts upwards for Intel signals', () => {
    expect(signalBits(signal({ startBit: 6, length: 4 }))).toEqual([6, 7, 8, 9]);
  });

  it('wraps to bit 7 of the next byte for Motorola signals', () => {
    expect(signalBits(signal({ byteOrder: 'motorola', startBit: 7, length: 10 }))).toEqual([
      7, 6, 5, 4, 3, 2, 1, 0, 15, 14,
    ]);
  });
});

describe('buildBitLayout', () => {
  it('merges adjacent bits of a signal into one cell per byte', () => {
    const rows = buildBitLayout(
      message(2, [
        signal({ name: 'A', byteOrder: 'motorola', startBit: 7, length: 10 }),
        signal({ name: 'B', startBit: 8, length: 6 }),
      ]),
    );

    expect(rows[0].cells).toEqual([expect.objectContaining({ label: 'A', colSpan: 8 })]);
    expect(rows[1].cells.map((c) => [c.label, c.colSpan])).toEqual([
      ['A', 2],
      ['B', 6],
    ]);
  });

  it('leaves unused bits as individual empty cells', () => {
    const [row] = buildBitLayout(message(1, [signal({ name: 'A', startBit: 0, length: 4 })]));

    expect(row.cells.map((c) => [c.label, c.colSpan])).toEqual([
      ['', 1],
      ['', 1],
      ['', 1],
      ['', 1],
      ['A', 4],
    ]);
  });

  it('marks overlapping signals, such as multiplexed ones', () => {
    const [row] = buildBitLayout(
      message(1, [signal({ name: 'A', startBit: 0 }), signal({ name: 'B', startBit: 0 })]),
    );

    expect(row.cells).toEqual([
      expect.objectContaining({ label: 'A +1', title: 'A, B', overlap: true, colSpan: 8 }),
    ]);
  });

  it('adds rows for signals that reach beyond the DLC', () => {
    const rows = buildBitLayout(message(1, [signal({ startBit: 8, length: 8 })]));

    expect(rows.map((r) => r.beyondDlc)).toEqual([false, true]);
  });
});
