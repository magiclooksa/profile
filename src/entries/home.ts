import { GetProfile } from '../application/GetProfile';
import { httpFetcher } from '../infrastructure/http/jsonFetcher';
import { JsonProfileRepository } from '../infrastructure/repositories/JsonProfileRepository';
import { renderApp, renderError } from '../presentation/site/App';

// Composition root: the only place that knows every layer.
const root = document.getElementById('app');
if (!root) throw new Error('#app not found');

const repository = new JsonProfileRepository(httpFetcher(`${import.meta.env.BASE_URL}data/`));

new GetProfile(repository)
  .execute()
  .then((profile) => renderApp(root, profile))
  .catch((error: unknown) => renderError(root, error));
