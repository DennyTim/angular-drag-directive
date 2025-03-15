import { Component } from '@angular/core';
import { ListDraggableDirective } from './list-draggable.directive';
import { SelectableDirective } from './selectable.directive';

@Component({
  selector: 'app-root',
  imports: [ListDraggableDirective, SelectableDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
