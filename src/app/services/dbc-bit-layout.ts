import { DbcMessage, DbcSignal } from '../models';

export interface BitCell {
  label: string;
  title: string;
  colSpan: number;
  hue: number | null;
  /** More than one signal occupies these bits (e.g. multiplexed signals). */
  overlap: boolean;
}

export interface BitRow {
  byte: number;
  /** The row lies beyond the message's DLC but a signal still reaches into it. */
  beyondDlc: boolean;
  cells: BitCell[];
}

const MAX_BYTES = 64;

/** Distinct, stable hue per signal index; shared by the bit layout and the signal table. */
export function signalHue(index: number): number {
  return Math.round((index * 137.508) % 360);
}

/** Bit positions (byte * 8 + bit) occupied by the signal, in significance order. */
export function signalBits(signal: DbcSignal): number[] {
  const bits: number[] = [];
  let position = signal.startBit;

  for (let i = 0; i < signal.length; i++) {
    bits.push(position);
    if (signal.byteOrder === 'intel') {
      position++;
    } else {
      // Motorola start bits are numbered MSB-first; the next bit after bit 0 is bit 7 of the next byte.
      position = position % 8 === 0 ? position + 15 : position - 1;
    }
  }

  return bits;
}

export function buildBitLayout(message: DbcMessage): BitRow[] {
  const occupants = new Map<number, number[]>();

  message.signals.forEach((signal, index) => {
    for (const bit of signalBits(signal)) {
      if (bit >= 0 && bit < MAX_BYTES * 8) {
        occupants.set(bit, [...(occupants.get(bit) ?? []), index]);
      }
    }
  });

  const usedBytes = Math.max(0, ...[...occupants.keys()].map((bit) => (bit >> 3) + 1));
  const rowCount = Math.min(MAX_BYTES, Math.max(message.dlc, usedBytes));
  const rows: BitRow[] = [];

  for (let byte = 0; byte < rowCount; byte++) {
    const segments: { indexes: number[]; span: number }[] = [];

    for (let bit = 7; bit >= 0; bit--) {
      const indexes = occupants.get(byte * 8 + bit) ?? [];
      const previous = segments.at(-1);
      if (previous && indexes.length > 0 && previous.indexes.join() === indexes.join()) {
        previous.span++;
      } else {
        segments.push({ indexes, span: 1 });
      }
    }

    rows.push({
      byte,
      beyondDlc: byte >= message.dlc,
      cells: segments.map(({ indexes, span }) => {
        const names = indexes.map((index) => message.signals[index].name);
        return {
          label: names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? ''),
          title: names.join(', '),
          colSpan: span,
          hue: indexes.length > 0 ? signalHue(indexes[0]) : null,
          overlap: indexes.length > 1,
        };
      }),
    });
  }

  return rows;
}
