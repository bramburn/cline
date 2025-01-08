import { Container } from 'inversify';
import { NotificationService } from './services/NotificationService';
import { TYPES } from './types';

const container = new Container();

container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService);

export { container };
