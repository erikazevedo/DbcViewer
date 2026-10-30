export type DbcByteOrder = 'intel' | 'motorola';
export type DbcValueType = 'integer' | 'float32' | 'float64';
export type DbcMultiplexing = 'none' | 'multiplexor' | 'multiplexed';

export interface DbcValueDescription {
  value: number;
  description: string;
}

export interface DbcSignal {
  name: string;
  startBit: number;
  length: number;
  byteOrder: DbcByteOrder;
  isSigned: boolean;
  valueType: DbcValueType;
  factor: number;
  offset: number;
  min: number;
  max: number;
  unit: string;
  receivers: string[];
  multiplexing: DbcMultiplexing;
  muxValue: number | null;
  comment: string;
  values: DbcValueDescription[];
}

export interface DbcMessage {
  /** ID exactly as written in the file, including the extended-frame flag (bit 31). */
  rawId: number;
  /** CAN identifier without the extended-frame flag. */
  id: number;
  idHex: string;
  isExtended: boolean;
  /** Vector's placeholder message that holds signals not assigned to any frame. */
  isPseudo: boolean;
  name: string;
  dlc: number;
  sender: string;
  comment: string;
  signals: DbcSignal[];
}

export interface DbcNode {
  name: string;
  comment: string;
}

export interface DbcDatabase {
  version: string;
  nodes: DbcNode[];
  messages: DbcMessage[];
  signalCount: number;
}
