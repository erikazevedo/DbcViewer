import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DbcMessage, DbcSignal } from '../../models';
import { signalHue } from '../../services/dbc-bit-layout';
import { BitLayoutComponent } from '../bit-layout/bit-layout.component';

@Component({
  selector: 'message-detail',
  imports: [BitLayoutComponent],
  templateUrl: './message-detail.component.html',
  styleUrl: './message-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageDetailComponent {
  readonly message = input.required<DbcMessage>();

  protected readonly signalHue = signalHue;

  protected format(signal: DbcSignal): string {
    const order = signal.byteOrder === 'intel' ? 'Intel' : 'Motorola';
    const type =
      signal.valueType === 'integer' ? (signal.isSigned ? 'signed' : 'unsigned') : signal.valueType;
    return `${order}, ${type}`;
  }
}
