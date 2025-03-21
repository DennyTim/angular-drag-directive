import {
  animate,
  AnimationBuilder,
  AnimationMetadata,
  style
} from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnInit,
  Renderer2
} from '@angular/core';

const constants = {
  direction: {
    UP: 'up',
    DOWN: 'down'
  },
  class: {
    DRAG_PLACEHOLDER: 'drag-placeholder',
    LIST_DRAG: 'list-drag',
    DRAGGING: 'dragging',
    HOST_DRAG: 'host-drag',
    HOST_RECEIVE: 'host-receive'
  },
  attribute: {
    LIST_DRAG: 'listDrag'
  }
};

@Directive({
  selector: '[listDraggable]',
  exportAs: 'listDraggable'
})
export class ListDraggableDirective implements OnInit {
  private mouseDown = false;
  private dragItem?: HTMLElement;
  private dragPlaceholder?: HTMLElement;
  private initialX = 0;
  private initialY = 0;
  private xOffset = 0;
  private yOffset = 0;
  private previousTarget: any = null;
  private elementSize = 0;

  @Input()
  public connectedTo?: ListDraggableDirective;

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.host.nativeElement.classList.contains(constants.class.HOST_RECEIVE)) {
      return;
    }

    if (this.mouseDown) {
      this.mouseDown = false;
    }

    if (!this.dragItem) {
      return;
    }

    const index = this.getDragPlaceholderIndex();
    const node = this.list[index];

    if (node) {
      const animation = this.animate(
        animate('200ms', style({
          top: node?.offsetTop,
          left: node?.offsetLeft
        })),
        this.dragItem
      );

      /**
       * Відключення анімації з прибранням плейсхолдера
       * і створенням елемента на місці плейсхолдера
       * */
      animation.onDone(() => {
        animation.destroy();

        this.renderer.removeAttribute(this.dragPlaceholder, 'style');
        this.renderer.removeAttribute(this.dragPlaceholder, 'class');

        this.dragPlaceholder?.remove();

        const refChild = this.list[index];

        this.renderer.removeAttribute(this.dragItem, 'style');
        this.renderer.removeAttribute(this.dragItem, 'class');

        this.renderer.insertBefore(
          this.host.nativeElement,
          this.dragItem,
          refChild,
          true
        );

        this.list.forEach((item) => {
          this.renderer.removeAttribute(item, 'style');
          this.renderer.removeAttribute(item, 'class');
        });

        this.renderer.removeAttribute(this.host.nativeElement, 'style');
        this.renderer.removeClass(this.host.nativeElement, constants.class.HOST_DRAG);

        this.resetConnectedHost();
      });
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(event: MouseEvent) {
    if (!this.mouseDown) {
      return;
    }

    if (!this.dragItem) {
      return;
    }

    /**
     * Присваюємо всі стилі для взятого елементу
     * залежно від руху курсора
     * */
    const newX = event.clientX - this.xOffset - window.scrollX;
    const newY = event.clientY - this.yOffset - window.scrollY;
    this.dragItem.style.left = newX + 'px';
    this.dragItem.style.top = newY + 'px';

    /**
     *
     * */
    if (!this.connectedTo?.host.nativeElement.children.length) {
        const hostReceive = this.document
          .elementsFromPoint(event.clientX, event.clientY)
          .find((el) =>
            el.classList.contains(constants.class.HOST_RECEIVE)
          );

        if (hostReceive) {
          this.resetHost();
          this.initializeConnectedHost(null, true);
        }
    }

    /**
     * Отримати список елементів з точок реагування
     * після івенту і серед списку елементів знайти елемент з атрибутом "ліст-драг"
     * на місце якого збираємось поставити взятий елемент
     * */
    const newTarget = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find(
        (el) =>
          el.hasAttribute(constants.attribute.LIST_DRAG) &&
          !el.classList.contains(constants.class.DRAGGING)
      ) as HTMLDivElement;

    if (newTarget !== this.previousTarget) {
      this.previousTarget = newTarget;

      if (newTarget) {


        if (newTarget.closest(`.${constants.class.HOST_RECEIVE}`)) {
          /**
           * Переміщення елементу серед різних списків
           * * */
          this.resetHost();
          this.initializeConnectedHost(<HTMLElement> newTarget);

        } else {
          /**
           * Переміщення елементу всередині списку
           * * */
          const placeholderIndex = this.getDragPlaceholderIndex();
          const targetIndex = this.getIndex(<HTMLElement> newTarget);

          const direction =
            placeholderIndex > targetIndex
              ? constants.direction.UP
              : constants.direction.DOWN;

          this.dragOperation(targetIndex, placeholderIndex, direction);
        }
      }
    }
  }

  constructor(
    @Inject(DOCUMENT)
    private readonly document: Document,
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly builder: AnimationBuilder
  ) {
  }

  private dragOperation(
    targetIndex: number,
    placeholderIndex: number,
    direction: string
  ) {
    const {
      class: { DRAG_PLACEHOLDER },
      direction: { UP }
    } = constants;

    const filtered = this.list.filter((item) => {
      const isDragPlaceholder = item.classList.contains(DRAG_PLACEHOLDER);

      const currentIndex = isDragPlaceholder
        ? this.getDragPlaceholderIndex()
        : this.getIndex(item);

      if (direction === UP) {
        return (
          currentIndex >= targetIndex
          && currentIndex <= placeholderIndex
          && !isDragPlaceholder
        );
      } else {
        return (
          currentIndex <= targetIndex
          && currentIndex >= placeholderIndex
          && !isDragPlaceholder
        );
      }
    });

    filtered.forEach((item) => {
      this.updateDragPlaceholderPosition(direction);
      this.updateElementPosition(item, direction);
    });
  }

  ngOnInit() {
    this.init();
  }

  get list(): HTMLElement[] {
    return Array.from(this.host.nativeElement.children) as HTMLElement[];
  }

  private init() {
    const {
      class: {
        DRAG_PLACEHOLDER,
        LIST_DRAG,
        DRAGGING,
        HOST_DRAG,
        HOST_RECEIVE
      }
    } = constants;

    const parent = this.host.nativeElement;

    parent.addEventListener('mousedown', (event) => {
      /**
       Отримуємо елемент за координатами події
       */
      const target = this.document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;

      if (target.classList.contains('list') && target.children.length === 0) {
        return;
      }
      /**
       Зберігаємо координатами елементу
       */
      this.initialX = target.offsetLeft;
      this.initialY = target.offsetTop;

      /**
       *
       * * */
      if (this.connectedTo) {
        this.connectedTo.initialX = this.initialX;
        this.connectedTo.initialY = this.initialY;
      }

      this.elementSize = +(Number(target.getBoundingClientRect().height).toFixed(2));
      this.mouseDown = true;
      this.dragItem = target;

      if (this.dragItem) {
        /**
         Створюємо плейсхолдер на місці взятого елементу
         */
        parent.style.userSelect = 'none';
        this.dragItem.style.userSelect = 'none';

        const dragItemRect = this.dragItem.getBoundingClientRect();
        const startWidth = dragItemRect.width;
        const startHeight = dragItemRect.height;

        this.dragPlaceholder = this.document.createElement('div');
        this.dragPlaceholder.style.width = startWidth + 'px';
        this.dragPlaceholder.style.height = startHeight + 'px';
        this.dragPlaceholder.classList.add(DRAG_PLACEHOLDER);

        /**
         Вставляємо плейсхолдер на місці взятого елементу
         */
        parent.insertBefore(this.dragPlaceholder, this.dragItem);
        parent.removeChild(this.dragItem);

        /**
         * Змінюємо конфігураційні класи на взятому елементі
         * */
        this.dragItem.classList.remove(LIST_DRAG);
        this.dragItem.classList.add(DRAGGING);

        /**
         *
         * * */
        if (this.connectedTo) {
          this.connectedTo.host.nativeElement.classList.add(HOST_RECEIVE);
        }

        /**
         * Присваюємо всі початкові стилі для симуляції
         * положення елемента на тому самому місці
         * */
        this.dragItem.style.position = 'absolute';
        this.dragItem.style.top = this.initialY + 'px';
        this.dragItem.style.left = this.initialX + 'px';
        this.dragItem.style.width = startWidth + 'px';
        this.dragItem.style.height = startHeight + 'px';

        /**
         * Отримання величини зміщення по взятому елементу
         * */
        this.xOffset = event.clientX - this.initialX - this.document.defaultView!.scrollX;
        this.yOffset = event.clientY - this.initialY - this.document.defaultView!.scrollY;

        /**
         *
         * * */
        if (this.connectedTo) {
          this.connectedTo.xOffset = this.xOffset;
          this.connectedTo.yOffset = this.yOffset;
        }

        /**
         * Вставка елементу в кінець сторінки при абсолютному позиціюванні
         * */
        this.renderer.appendChild(this.document.body, this.dragItem);


        this.host.nativeElement.classList.add(HOST_DRAG);
        this.list.forEach(item => item.classList.add(LIST_DRAG));
      }
    });
  }

  private getDragPlaceholderIndex(): number {

    const dragPlaceholderCurrentY = this.getTransform(this.dragPlaceholder!);

    let idx = this.list.indexOf(this.dragPlaceholder!);

    /**
     * Отримання висоти від краю до плейсхолдера поділеної на висоту елемента
     * отримуємо крок для визначення індексу елемента
     * */
    if (dragPlaceholderCurrentY <= -this.elementSize) {
      const translateStep =
        Math.abs(dragPlaceholderCurrentY) / this.elementSize;

      idx = idx - translateStep;
    }

    if (dragPlaceholderCurrentY >= this.elementSize) {
      idx = idx + dragPlaceholderCurrentY / this.elementSize;
    }

    return idx;
  }

  private getIndex(element: HTMLElement): number {
    const currentY = this.getTransform(element);

    let idx = this.list.indexOf(element);

    if (currentY === -this.elementSize) {
      idx--;
    }

    if (currentY === this.elementSize) {
      idx++;
    }

    return idx;
  }

  /**
   * Відновлення позиції елементів в залежності від переміщення плейсхолдера
   * */
  private updateElementPosition(element: HTMLElement, direction: string) {
    const currentY = this.getTransform(element);

    if (currentY === -this.elementSize) {
      element.style.transform = 'translateY(0px)';
    }

    if (currentY === 0) {
      element.style.transform = `translateY(${
        direction === 'down' ? -this.elementSize : this.elementSize
      }px)`;
    }

    if (currentY === this.elementSize) {
      element.style.transform = 'translateY(0px)';
    }
  }

  /**
   * Відновлення позиції плесхолдера в залежності
   * від переміщення за напрямком в списку
   * */
  private updateDragPlaceholderPosition(direction: string) {
    const currentY = this.getTransform(this.dragPlaceholder!);

    if (Math.abs(currentY) > 0) {
      this.dragPlaceholder!.style.transform = `translateY(${
        direction === 'down'
          ? currentY + this.elementSize
          : currentY - this.elementSize
      }px)`;
    } else {
      this.dragPlaceholder!.style.transform = `translateY(${
        direction === 'down' ? this.elementSize : -this.elementSize
      }px)`;
    }
  }

  private animate(animationMetadata: AnimationMetadata | AnimationMetadata[], element: HTMLElement) {
    const animation = this.builder.build(animationMetadata);
    const player = animation.create(element);
    player.play();

    return player;
  }

  private getTransform(element: HTMLElement) {
    const value = element.style.getPropertyValue('transform');
    const reg = new RegExp(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g);
    const replacedValue = value.match(reg);

    return replacedValue ? Number(replacedValue[0]) : 0;
  }

  private resetHost(): void {
    const { HOST_DRAG, HOST_RECEIVE } = constants.class;

    this.renderer.removeAttribute(this.dragPlaceholder, 'styles');
    this.renderer.removeAttribute(this.dragPlaceholder, 'class');

    this.dragPlaceholder?.remove();

    this.renderer.removeAttribute(this.host.nativeElement, 'class');
    this.renderer.removeClass(this.host.nativeElement, HOST_DRAG);

    this.renderer.addClass(this.host.nativeElement, HOST_RECEIVE);

    this.list.forEach(item => {
      this.renderer.removeAttribute(item, 'class');
      this.renderer.removeAttribute(item, 'style');
    });
  }

  private initializeConnectedHost(
    target: HTMLElement | null = null,
    isListEmpty = false
  ): void {
    const {
      HOST_DRAG,
      HOST_RECEIVE,
      DRAG_PLACEHOLDER,
      LIST_DRAG
    } = constants.class;

    const connectedParent = this.connectedTo!.host.nativeElement;
    connectedParent.style.userSelect = 'none';

    this.renderer.removeClass(connectedParent, HOST_RECEIVE);
    this.renderer.addClass(connectedParent, HOST_DRAG);

    this.connectedTo!.list.forEach(item => {
      this.renderer.addClass(item, LIST_DRAG);
    });

    const dragItemRect = this.dragItem?.getBoundingClientRect();
    const startWidth = dragItemRect!.width;
    const startHeight = dragItemRect!.height;

    this.connectedTo!.dragPlaceholder = this.document.createElement('div');
    this.connectedTo!.dragPlaceholder.style.width = startWidth + 'px';
    this.connectedTo!.dragPlaceholder.style.height = startHeight + 'px';
    this.connectedTo!.dragPlaceholder.classList.add(DRAG_PLACEHOLDER);

    if (isListEmpty) {
      this.renderer.appendChild(
        connectedParent,
        this.connectedTo?.dragPlaceholder
      )
    } else {
      this.renderer.insertBefore(
        connectedParent,
        this.connectedTo?.dragPlaceholder,
        target,
        true
      );
    }

    this.connectedTo!.elementSize = this.elementSize;
    this.connectedTo!.dragItem = this.dragItem;
    this.connectedTo!.mouseDown = true;
  }

  private resetConnectedHost() {
    const connectedHost = this.connectedTo!.host.nativeElement;
    const { HOST_RECEIVE, HOST_DRAG } = constants.class;

    if (this.connectedTo) {
      this.renderer.removeClass(connectedHost, HOST_RECEIVE);
    }

    if (this.connectedTo && this.connectedTo.mouseDown) {
      this.connectedTo.mouseDown = false;

      this.renderer.removeClass(connectedHost, HOST_RECEIVE);
      this.renderer.removeAttribute(this.connectedTo.dragPlaceholder, 'style');
      this.renderer.removeAttribute(this.connectedTo.dragPlaceholder, 'class');

      this.connectedTo.dragPlaceholder?.remove();
      this.renderer.removeAttribute(this.connectedTo.dragItem, 'style');
      this.renderer.removeAttribute(this.connectedTo.dragItem, 'class');

      this.connectedTo.list.forEach(item => {
        this.renderer.removeAttribute(item, 'class');
        this.renderer.removeAttribute(item, 'style');
      });

      this.renderer.removeAttribute(connectedHost, 'style');
      this.renderer.removeClass(connectedHost, HOST_DRAG);
    }
  }
}
