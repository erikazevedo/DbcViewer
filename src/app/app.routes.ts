import { Routes } from '@angular/router';
import { NotFoundComponent } from './error/notfound';
import { ViewerPageComponent } from './pages/viewer.page';

export const routes: Routes = [
  {
    path: '',
    component: ViewerPageComponent,
    title: 'Viewer',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not Found',
  },
];
