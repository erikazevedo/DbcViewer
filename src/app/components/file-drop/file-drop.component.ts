import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'file-drop',
  templateUrl: './file-drop.component.html',
  styleUrl: './file-drop.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dragging]': 'dragging()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'dragging.set(false)',
    '(drop)': 'onDrop($event)',
  },
})
export class FileDropComponent {
  readonly error = input<string | null>(null);
  readonly fileSelected = output<File>();
  readonly exampleRequested = output<void>();

  protected readonly dragging = signal(false);

  protected onFileChosen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    // Allows choosing the same file again after closing it.
    input.value = '';
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.fileSelected.emit(file);
  }
}
