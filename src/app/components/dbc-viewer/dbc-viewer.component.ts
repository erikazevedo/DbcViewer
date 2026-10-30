import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DbcMessage } from '../../models';
import { DbcService } from '../../services/dbc.service';
import { FileDropComponent } from '../file-drop/file-drop.component';
import { MessageDetailComponent } from '../message-detail/message-detail.component';
import { MessageListComponent } from '../message-list/message-list.component';

function involvesNode(message: DbcMessage, node: string): boolean {
  return message.sender === node || message.signals.some((s) => s.receivers.includes(node));
}

function matchesQuery(message: DbcMessage, query: string): boolean {
  return (
    message.name.toLowerCase().includes(query) ||
    message.idHex.toLowerCase().includes(query) ||
    String(message.id).startsWith(query) ||
    message.sender.toLowerCase().includes(query) ||
    message.comment.toLowerCase().includes(query) ||
    message.signals.some((s) => s.name.toLowerCase().includes(query))
  );
}

@Component({
  selector: 'dbc-viewer',
  imports: [ReactiveFormsModule, FileDropComponent, MessageListComponent, MessageDetailComponent],
  templateUrl: './dbc-viewer.component.html',
  styleUrl: './dbc-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DbcViewerComponent {
  protected readonly dbc = inject(DbcService);

  protected readonly filterControl = new FormControl('', { nonNullable: true });
  protected readonly nodeControl = new FormControl('', { nonNullable: true });
  protected readonly selectedId = signal<number | null>(null);

  private readonly filter = toSignal(this.filterControl.valueChanges, { initialValue: '' });
  private readonly node = toSignal(this.nodeControl.valueChanges, { initialValue: '' });

  protected readonly filteredMessages = computed(() => {
    const query = this.filter().trim().toLowerCase();
    const node = this.node();

    return (this.dbc.database()?.messages ?? []).filter(
      (message) => (!node || involvesNode(message, node)) && (!query || matchesQuery(message, query)),
    );
  });

  protected readonly selectedMessage = computed<DbcMessage | null>(() => {
    const messages = this.filteredMessages();
    return messages.find((message) => message.rawId === this.selectedId()) ?? messages[0] ?? null;
  });

  protected onFileSelected(file: File) {
    void this.dbc.loadFile(file);
  }

  protected onExampleRequested() {
    void this.dbc.loadExample();
  }

  protected closeFile() {
    this.filterControl.reset();
    this.nodeControl.reset();
    this.selectedId.set(null);
    this.dbc.clear();
  }
}
