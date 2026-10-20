import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import { GetProfile } from './application/GetProfile';
import { JsonProfileRepository, httpFetcher } from './infrastructure/JsonProfileRepository';
import { renderApp, renderError } from './presentation/App';

// Composition root: the only place that knows every layer.
const root = document.getElementById('app');
if (!root) throw new Error('#app not found');

const repository = new JsonProfileRepository(httpFetcher(`${import.meta.env.BASE_URL}data/`));

new GetProfile(repository)
  .execute()
  .then((profile) => renderApp(root, profile))
  .catch((error: unknown) => renderError(root, error));
