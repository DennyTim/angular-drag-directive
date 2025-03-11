import { Component } from '@angular/core';
import { ListDraggableDirective } from './list-draggable.directive';

@Component({
  selector: 'app-root',
  imports: [ListDraggableDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
