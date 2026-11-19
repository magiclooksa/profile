import { ContentService } from '../application/content/ContentService';
import {
  HttpContentRepository, HttpMediaLibrary, HttpPublishMonitor, HttpSessionGateway,
} from '../infrastructure/content/HttpContentRepository';
import { schemaValidator } from '../infrastructure/content/schemaValidator';
import { DashboardApp, renderError } from '../presentation/dashboard/DashboardApp';
import '../styles/dashboard.css';

// Composition root of the dashboard: the only place that knows every layer.
const root = document.getElementById('dashboard');
if (!root) throw new Error('#dashboard not found');

const service = new ContentService(
  new HttpContentRepository(), new HttpMediaLibrary(), schemaValidator, new HttpPublishMonitor(),
);

new DashboardApp(root, service, new HttpSessionGateway(), { siteBase: './' })
  .start()
  .catch((error: unknown) => root.replaceChildren(renderError(error)));
