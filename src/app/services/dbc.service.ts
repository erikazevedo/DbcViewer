import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DbcDatabase } from '../models';
import { DbcParserService } from './dbc-parser.service';

const EXAMPLE_URL = 'samples/EV-can_ZE0.dbc';
const EXAMPLE_NAME = 'EV-can_ZE0.dbc';

/** Holds the currently loaded DBC file; everything happens in the browser. */
@Injectable({ providedIn: 'root' })
export class DbcService {
  private readonly parser = inject(DbcParserService);
  private readonly http = inject(HttpClient);

  readonly database = signal<DbcDatabase | null>(null);
  readonly fileName = signal('');
  readonly error = signal<string | null>(null);

  async loadFile(file: File): Promise<void> {
    try {
      this.load(file.name, this.decode(await file.arrayBuffer()));
    } catch {
      this.error.set('The file could not be read.');
    }
  }

  async loadExample(): Promise<void> {
    try {
      this.load(EXAMPLE_NAME, await firstValueFrom(this.http.get(EXAMPLE_URL, { responseType: 'text' })));
    } catch {
      this.error.set('The example file could not be loaded.');
    }
  }

  clear() {
    this.database.set(null);
    this.fileName.set('');
    this.error.set(null);
  }

  private load(name: string, text: string) {
    const database = this.parser.parse(text);

    if (database.messages.length === 0) {
      this.error.set('No messages were found. Is this a DBC file?');
      return;
    }

    this.database.set(database);
    this.fileName.set(name);
    this.error.set(null);
  }

  /** DBC files are often Windows-1252 rather than UTF-8. */
  private decode(buffer: ArrayBuffer): string {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      return new TextDecoder('windows-1252').decode(buffer);
    }
  }
}
