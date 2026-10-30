import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DbcViewerComponent } from '../components/dbc-viewer/dbc-viewer.component';

@Component({
  selector: 'viewer-page',
  imports: [DbcViewerComponent],
  template: `<dbc-viewer></dbc-viewer>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  `,
})
export class ViewerPageComponent {}
