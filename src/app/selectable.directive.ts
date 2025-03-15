import {
  Directive,
  ElementRef,
  HostListener,
  OnInit,
  Renderer2
} from '@angular/core';
import { ListSelection } from './models/list-selection';
import { TableSelection } from './models/table-selection';

@Directive({
  selector: 'table[selectable], div[selectable]'
})
export class SelectableDirective implements OnInit {
  private selectionInstance!: ListSelection | TableSelection;
  private selectableType!: string;

  @HostListener('document:mousedown', ['$event'])
  mousedownGlobal(event: any) {
    const { target } = event;
    if (!this.host.nativeElement.contains(target) && this.selectionInstance?.selection) {
      this.selectionInstance.selection.remove();
    }
  }

  @HostListener('document:mouseup')
  mouseupGlobal(event: any) {
    this.selectionInstance.onMouseUp();
  }

  constructor(
    private readonly host: ElementRef<HTMLTableElement>,
    private readonly renderer: Renderer2
  ) {
  }

  ngOnInit() {
    this.init();
  }

  private init() {
    this.selectableType = this.host.nativeElement.tagName;

    this.selectionInstance = this.selectableType === 'TABLE'
      ? new TableSelection(
        this.host.nativeElement,
        this.renderer
      )
      : new ListSelection(
        this.host.nativeElement,
        this.renderer
      );

    this.selectionInstance.handleMouseDown();
    this.selectionInstance.handleMouseMove();
    this.selectionInstance.handleMouseUp();
  }
}
