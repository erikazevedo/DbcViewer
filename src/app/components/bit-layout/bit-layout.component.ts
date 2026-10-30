import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DbcMessage } from '../../models';
import { buildBitLayout } from '../../services/dbc-bit-layout';

@Component({
  selector: 'bit-layout',
  templateUrl: './bit-layout.component.html',
  styleUrl: './bit-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BitLayoutComponent {
  readonly message = input.required<DbcMessage>();

  protected readonly bits = [7, 6, 5, 4, 3, 2, 1, 0];
  protected readonly rows = computed(() => buildBitLayout(this.message()));
}
