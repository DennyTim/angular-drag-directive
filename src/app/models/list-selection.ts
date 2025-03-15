import { Renderer2 } from '@angular/core';

export class ListSelection {
  public selection: HTMLElement | null = null;
  private mouseDown = false;
  private start: HTMLElement | null = null;
  private end: HTMLElement | null = null;
  private positions = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };
  private listChildren: Element[] = [];

  constructor(
    readonly list: HTMLElement,
    readonly renderer: Renderer2
  ) {
  }

  handleMouseDown() {
    this.listChildren = Array.from(this.list.children);

    this.list.addEventListener('mousedown', event => {
      const newTarget = <HTMLElement> document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((item) => item.hasAttribute('selectableItem'));

      if (!newTarget?.closest('[selectableItem]')) {
        return;
      }

      this.start = newTarget;
      this.mouseDown = true;

      if (!this.list.contains(this.selection)) {
        this.selection = this.renderer.createElement('div');
        this.renderer.addClass(this.selection, 'selection');
        this.renderer.appendChild(this.list, this.selection);
      }

      const rect = newTarget?.getBoundingClientRect();
      const rectList = this.list.getBoundingClientRect();

      this.renderer.setStyle(this.list, 'userSelect', 'none');

      /**
       * Визначення розміру комірки під час вибору для підсвічування
       * */
      const top = newTarget.offsetTop;
      const left = newTarget.offsetLeft;
      const right = this.list.clientWidth - rect.left - rect.width + rectList.x;
      const bottom = this.list.clientHeight - rect.bottom + rectList.y;

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
    this.list.addEventListener('mousemove', (event) => {
      const newTarget = <HTMLElement> document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((item) => item.hasAttribute('selectableItem'));

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

  private apply(start: HTMLElement, end: HTMLElement) {
    const rectEnd = end.getBoundingClientRect();
    const rectList = this.list.getBoundingClientRect();

    if (start.isEqualNode(end)) {
      const top = this.end?.offsetTop + 'px';
      const left = this.end?.offsetLeft + 'px';
      const bottom = this.list.clientHeight - rectEnd.bottom + rectList.y + 'px';
      const right = this.list.clientWidth - rectEnd.left - rectEnd.width + rectList.x + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'left', left);
      this.renderer.setStyle(this.selection, 'right', right);
      this.renderer.setStyle(this.selection, 'bottom', bottom);

      return;
    }

    let startIndex = this.listChildren.indexOf(start);
    let endIndex = this.listChildren.indexOf(end);

    if (startIndex > endIndex) {
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
      const bottom = this.list.clientHeight - rectEnd.bottom + rectList.y + 'px';

      this.renderer.setStyle(this.selection, 'top', top);
      this.renderer.setStyle(this.selection, 'bottom', bottom);
    }
  }

  public handleMouseUp(): void {
    this.list.addEventListener('mouseup', () => this.onMouseUp());
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
