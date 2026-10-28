import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import { GetProfile } from './application/GetProfile';
import { ApiContent, ApiMessageGateway, apiBase } from './infrastructure/api';
import { JsonProfileRepository, httpFetcher } from './infrastructure/JsonProfileRepository';
import { renderApp, renderError } from './presentation/App';

// Composition root: the only place that knows every layer.
const root = document.getElementById('app');
if (!root) throw new Error('#app not found');

// Content comes from the database when the server is reachable, otherwise from public/data.
const content = new ApiContent(apiBase(), httpFetcher(`${import.meta.env.BASE_URL}data/`));
const repository = new JsonProfileRepository(content.fetcher);

Promise.all([new GetProfile(repository).execute(), content.online()])
  .then(([profile, online]) => renderApp(root, profile, online ? new ApiMessageGateway(apiBase()) : null))
  .catch((error: unknown) => renderError(root, error));
