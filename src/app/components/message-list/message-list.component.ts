import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DbcMessage } from '../../models';

@Component({
  selector: 'message-list',
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListComponent {
  readonly messages = input.required<DbcMessage[]>();
  readonly selectedId = input<number | null>(null);
  readonly selected = output<number>();
}
