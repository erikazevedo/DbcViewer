import { TestBed } from '@angular/core/testing';
import { DbcParserService } from './dbc-parser.service';

const EXTENDED_RAW_ID = 0x80000000 + 0x18fef100;

const SAMPLE = [
  'VERSION "1.0"',
  '',
  'NS_ : ',
  '\tNS_DESC_',
  '\tCM_',
  '\tBA_DEF_',
  '\tVAL_',
  '',
  'BS_:',
  '',
  'BU_: VCM HVBAT',
  '',
  'BO_ 468 x1D4: 8 VCM',
  ' SG_ Torque : 23|12@0+ (0.25,0) [0|1024] "Nm" HVBAT,Vector__XXX',
  ' SG_ Mode M : 0|2@1+ (1,0) [0|3] "" Vector__XXX',
  ' SG_ Temp m1 : 8|8@1- (0.5,-40) [-40|87.5] "degC" HVBAT',
  ' SG_ Speed : 16|32@1+ (1,0) [0|0] "" Vector__XXX',
  '',
  `BO_ ${EXTENDED_RAW_ID} Ext: 8 Vector__XXX`,
  ' SG_ Flag : 0|1@1+ (1,0) [0|1] "" Vector__XXX',
  '',
  'BO_ 3221225472 VECTOR__INDEPENDENT_SIG_MSG: 0 Vector__XXX',
  ' SG_ Loose : 0|8@1+ (1,0) [0|0] "" Vector__XXX',
  '',
  'CM_ BU_ VCM "Vehicle Control Module";',
  'CM_ BO_ 468 "Line one; still line one',
  'line two";',
  'CM_ SG_ 468 Torque "Says \\"hi\\"";',
  'VAL_ 468 Mode 2 "Two" 0 "Zero" 1 "One" ;',
  'SIG_VALTYPE_ 468 Speed : 1;',
  '',
].join('\r\n');

describe('DbcParserService', () => {
  const parse = () => TestBed.inject(DbcParserService).parse(SAMPLE);

  it('reads version and nodes, applying node comments', () => {
    const db = parse();

    expect(db.version).toBe('1.0');
    expect(db.nodes).toEqual([
      { name: 'VCM', comment: 'Vehicle Control Module' },
      { name: 'HVBAT', comment: '' },
    ]);
  });

  it('sorts messages by id with the pseudo message last', () => {
    const db = parse();

    expect(db.messages.map((m) => m.name)).toEqual(['x1D4', 'Ext', 'VECTOR__INDEPENDENT_SIG_MSG']);
    expect(db.signalCount).toBe(6);
  });

  it('formats standard, extended and pseudo ids', () => {
    const [standard, extended, pseudo] = parse().messages;

    expect(standard).toMatchObject({ idHex: '0x1D4', id: 468, isExtended: false });
    expect(extended).toMatchObject({ idHex: '0x18FEF100', isExtended: true, sender: '' });
    expect(pseudo).toMatchObject({ isPseudo: true, isExtended: false });
  });

  it('parses signal definitions', () => {
    const torque = parse().messages[0].signals[0];

    expect(torque).toMatchObject({
      name: 'Torque',
      startBit: 23,
      length: 12,
      byteOrder: 'motorola',
      isSigned: false,
      factor: 0.25,
      offset: 0,
      min: 0,
      max: 1024,
      unit: 'Nm',
      receivers: ['HVBAT'],
    });
  });

  it('parses multiplexing, signedness and float types', () => {
    const [, mode, temp, speed] = parse().messages[0].signals;

    expect(mode).toMatchObject({ multiplexing: 'multiplexor', muxValue: null });
    expect(temp).toMatchObject({
      multiplexing: 'multiplexed',
      muxValue: 1,
      isSigned: true,
      byteOrder: 'intel',
      offset: -40,
    });
    expect(speed.valueType).toBe('float32');
  });

  it('keeps multi-line comments, escaped quotes and semicolons inside strings', () => {
    const message = parse().messages[0];

    expect(message.comment).toBe('Line one; still line one\nline two');
    expect(message.signals[0].comment).toBe('Says "hi"');
  });

  it('sorts value descriptions by value', () => {
    const mode = parse().messages[0].signals[1];

    expect(mode.values).toEqual([
      { value: 0, description: 'Zero' },
      { value: 1, description: 'One' },
      { value: 2, description: 'Two' },
    ]);
  });

  it('returns no messages for non-DBC text', () => {
    expect(TestBed.inject(DbcParserService).parse('hello world').messages).toEqual([]);
  });
});
