import { Container } from 'inversify';
import { registerServices } from './registrations';

const container = new Container({
  defaultScope: "Singleton",
  autoBindInjectable: true,
  skipBaseClassChecks: false
});

registerServices(container);

export { container }; 