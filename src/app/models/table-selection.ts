import { Renderer2 } from '@angular/core';

export class TableSelection {
  public selection: HTMLElement | null = null;
  private mouseDown = false;
  private start: HTMLTableCellElement | null = null;
  private end: HTMLTableCellElement | null = null;
  private positions = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };
  private rows: HTMLTableRowElement[] = [];

  constructor(
    readonly table: HTMLTableElement,
    readonly renderer: Renderer2
  ) {
  }

  handleMouseDown() {
    this.rows = Array.from(this.table.querySelectorAll('tr'));

    this.table.addEventListener('mousedown', event => {
      const newTarget = <HTMLTableCellElement> document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((item) => item.tagName === 'TD');

      if (!newTarget?.closest('td')) {
        return;
      }

      this.start = newTarget;
      this.mouseDown = true;

      if (!this.table.contains(this.selection)) {
        this.selection = this.renderer.createElement('div');
        this.renderer.addClass(this.selection, 'selection');
        this.renderer.appendChild(this.table, this.selection);
      }

      const rect = newTarget?.getBoundingClientRect();
      const rectTable = this.table.getBoundingClientRect();

      this.renderer.setStyle(this.table, 'userSelect', 'none');

      /**
       * Визначення розміру комірки під час вибору для підсвічування
       * */
      const top = newTarget.offsetTop;
      const left = newTarget.offsetLeft;
      const right = rectTable.width - rect.left - rect.width + rectTable.x;
      const bottom = rectTable.height - rect.bottom + rectTable.y;

      this.renderer.setStyle(this.selection, 'top', top + 'px');
      this.renderer.setStyle(this.selection, 'left', left + 'px');
      this.renderer.setStyle(this.selection, 'right', right + 'px');
      this.renderer.setStyle(this.selection, 'bottom', bottom + 'px');

      this.positions = {
        top,
        left,
        bottom,
        right
      };
    });
  }

  handleMouseMove() {
    this.table.addEventListener('mousemove', (event) => {
      const newTarget = <HTMLTableCellElement> document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((item) => item.tagName === 'TD');

      if (!newTarget) {
        return;
      }

      if (!this.mouseDown) {
        return;
      }

      if (newTarget.tagName !== 'TD') {
        return;
      }

      if (newTarget === this.end) {
        return;
      }

      if (this.start) {
        this.end = newTarget;
        this.apply(this.start, this.end);
      }
    });
  }

  private apply(start: HTMLTableCellElement, end: HTMLTableCellElement) {
    const rectEnd = end.getBoundingClientRect();
    const rectTable = this.table.getBoundingClientRect();

    if (start.isEqualNode(end)) {
      const top = this.end?.offsetTop + 'px';
      const left = this.end?.offsetLeft + 'px';
      const bottom = this.table.clientHeight - rectEnd.bottom + rectTable.y + 'px';
      const right = this.table.clientWidth - rectEnd.left - rectEnd.width + rectTable.x + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'right', right);
      this.renderer.setStyle(this.selection, 'bottom', bottom);

      return;
    }

    const startParentRow = start.closest('tr');
    const endParentRow = end.closest('tr');

    let startRowIndex = this.rows.indexOf(startParentRow!);
    let endRowIndex = this.rows.indexOf(endParentRow!);

    let startColIndex = -1;
    let endColIndex = -1;

    this.rows.forEach(row => {
      const rowChildren = Array.from(row.querySelectorAll('td'));

      const idx1 = rowChildren.indexOf(start);
      const idx2 = rowChildren.indexOf(end);

      if (idx1 > -1) {
        startColIndex = idx1;
      }

      if (idx2 > -1) {
        endColIndex = idx2;
      }
    });

    if (startRowIndex > endRowIndex) {
      /**
       * Початок виділення елементів в колонці знизу-вверх
       * */
      const top = end.offsetTop + 'px';
      const bottom = this.positions.bottom + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
    } else {
      /**
       * Початок виділення елементів в колонці зверху-вниз
       * */
      const top = this.positions.top + 'px';
      const bottom = this.table.clientHeight - rectEnd.bottom + rectTable.y + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
    }

    if (startColIndex > endColIndex) {
      /**
       * Початок виділення елементів в колонках справа-наліво
       * */
      const left = end.offsetLeft + 'px';
      const right = this.positions.right + 'px';
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'right', right);
    } else {
      /**
       * Початок виділення елементів в колонках наліво-справа
       * */
      const left = this.positions.left + 'px';
      const right = this.table.clientWidth - rectEnd.left - rectEnd.width + rectTable.x + 'px';
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'right', right);
    }
  }

  public handleMouseUp(): void {
    this.table.addEventListener('mouseup', () => this.onMouseUp());
  }

  public onMouseUp(): void {
    if (this.mouseDown) {
      this.mouseDown = false;
    }

    if (this.start) {
      this.start = null;
      this.end = null;
    }
  }
}
