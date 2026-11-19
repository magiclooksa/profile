import type { ContentService } from '../../../application/content/ContentService';
import { SessionExpiredError, type ContentDocument, type JsonValue } from '../../../domain/content';
import { h } from '../../shared/dom';
import { renderJsonForm } from '../form/JsonForm';

export interface DocumentViewOptions {
  readonly mediaBase: string;
  readonly mediaListId: string;
  /** Tells the shell whether there are unsaved changes. */
  onDirtyChange(dirty: boolean): void;
  onSaved(): void;
  onUploaded(path: string): void;
  onSessionExpired(): void;
}

type Mode = 'form' | 'json';

const clone = (value: JsonValue): JsonValue => structuredClone(value);

/** Edits one document: a form or the raw JSON, with save, undo and messages. */
export class DocumentView {
  readonly element: HTMLElement;
  private original: JsonValue;
  private draft: { value: JsonValue };
  private mode: Mode = 'form';
  private dirty = false;
  private jsonError: string | null = null;
  private saving = false;

  private readonly body = h('div', { class: 'doc-body' });
  private readonly status = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
  private readonly saveButton = h('button', { type: 'button', class: 'btn btn-primary' }, 'حفظ');
  private readonly undoButton = h('button', { type: 'button', class: 'btn btn-ghost' }, 'تراجع عن التعديلات');
  private readonly tabs: Record<Mode, HTMLButtonElement> = {
    form: h('button', { type: 'button', role: 'tab', class: 'tab' }, 'النموذج'),
    json: h('button', { type: 'button', role: 'tab', class: 'tab' }, 'JSON'),
  };
  private readonly readOnly: boolean;

  constructor(
    private readonly service: ContentService,
    private readonly doc: ContentDocument,
    value: JsonValue,
    private readonly options: DocumentViewOptions,
  ) {
    this.original = value;
    this.draft = { value: clone(value) };
    this.readOnly = service.isReadOnly(doc.path);

    this.saveButton.addEventListener('click', () => void this.save());
    this.undoButton.addEventListener('click', () => this.undo());
    for (const mode of ['form', 'json'] as const) this.tabs[mode].addEventListener('click', () => this.switchTo(mode));

    this.element = h('div', { class: 'view document' },
      h('header', { class: 'view-head sticky' },
        h('div', {},
          h('p', { class: 'kicker', dir: 'ltr' }, doc.path),
          h('h1', {}, doc.title),
          h('p', { class: 'muted' }, doc.description)),
        h('div', { class: 'actions' }, this.readOnly ? null : [this.undoButton, this.saveButton])),
      h('div', { class: 'tabs', role: 'tablist' }, this.tabs.form, this.tabs.json),
      this.readOnly ? h('p', { class: 'alert alert-info' }, 'هذا الملف يُكتب تلقائياً من ملفات الكتالوجات، فهو للعرض فقط.') : null,
      this.status,
      this.body);
    this.render();
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  /** Ctrl+S / Cmd+S saves. */
  handleKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.save();
    }
  }

  private setDirty(dirty: boolean): void {
    this.dirty = dirty;
    this.options.onDirtyChange(dirty);
    this.updateButtons();
  }

  private updateButtons(): void {
    this.saveButton.disabled = !this.dirty || this.saving || this.jsonError !== null;
    this.undoButton.disabled = !this.dirty || this.saving;
    this.saveButton.textContent = this.saving ? 'جارٍ الحفظ…' : 'حفظ';
    for (const mode of ['form', 'json'] as const) {
      this.tabs[mode].setAttribute('aria-selected', String(this.mode === mode));
    }
  }

  private showStatus(kind: 'success' | 'error' | 'info', message: string): void {
    this.status.replaceChildren(h('p', { class: `alert alert-${kind}` }, message));
  }

  private switchTo(mode: Mode): void {
    if (mode === this.mode) return;
    if (this.jsonError) {
      this.showStatus('error', 'صحّح JSON أولاً قبل العودة إلى النموذج.');
      return;
    }
    this.mode = mode;
    this.render();
  }

  private render(): void {
    const onChange = (): void => { if (!this.dirty) this.setDirty(true); };
    if (this.mode === 'form') {
      this.body.replaceChildren(renderJsonForm(this.draft, {
        mediaBase: this.options.mediaBase,
        mediaListId: this.options.mediaListId,
        readOnly: this.readOnly,
        onChange,
        upload: async (file) => {
          try {
            const path = await this.service.uploadMedia(file, file.name);
            this.options.onUploaded(path);
            this.showStatus('success', `رُفع الملف: ${path}. احفظ لتثبيته في الصفحة.`);
            return path;
          } catch (error) {
            if (error instanceof SessionExpiredError) this.options.onSessionExpired();
            else this.showStatus('error', `تعذّر الرفع: ${(error as Error).message}`);
            return null;
          }
        },
      }));
    } else {
      const area = h('textarea', { class: 'input json-editor', dir: 'ltr', spellcheck: 'false', readonly: this.readOnly });
      area.value = JSON.stringify(this.draft.value, null, 2);
      area.addEventListener('input', () => {
        try {
          this.draft.value = JSON.parse(area.value) as JsonValue;
          this.jsonError = null;
          this.status.replaceChildren();
        } catch (error) {
          this.jsonError = (error as Error).message;
          this.showStatus('error', `JSON غير صحيح: ${this.jsonError}`);
        }
        onChange();
        this.updateButtons();
      });
      this.body.replaceChildren(area);
    }
    this.updateButtons();
  }

  private async save(): Promise<void> {
    if (!this.dirty || this.saving || this.jsonError || this.readOnly) return;
    this.saving = true;
    this.updateButtons();
    let result;
    try {
      result = await this.service.saveDocument(this.doc.path, this.draft.value);
    } catch (error) {
      this.saving = false;
      this.updateButtons();
      if (error instanceof SessionExpiredError) this.options.onSessionExpired();
      else this.showStatus('error', `لم يُحفظ: ${(error as Error).message}`);
      return;
    }
    this.saving = false;
    if (result.ok) {
      this.original = clone(this.draft.value);
      this.setDirty(false);
      this.showStatus('success', 'تم الحفظ. يظهر التعديل في الموقع خلال لحظات.');
      this.options.onSaved();
    } else {
      this.updateButtons();
      const prefix = result.reason === 'invalid' ? 'لم يُحفظ، في البيانات خطأ: ' : 'لم يُحفظ: ';
      this.showStatus('error', `${prefix}${result.message}`);
    }
  }

  private undo(): void {
    if (!confirm('التراجع عن كل التعديلات غير المحفوظة؟')) return;
    this.draft = { value: clone(this.original) };
    this.jsonError = null;
    this.status.replaceChildren();
    this.setDirty(false);
    this.render();
  }
}
