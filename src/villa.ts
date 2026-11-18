import './styles/tokens.css';
import './styles/base.css';
import './styles/site.css';
import './styles/villa.css';
import { httpFetcher } from './infrastructure/JsonProfileRepository';
import { JsonVillaRepository } from './infrastructure/JsonVillaRepository';
import { renderVilla, renderVillaError } from './presentation/villa/VillaPage';
import { initSiteChrome } from './presentation/siteChrome';

initSiteChrome('./');

// Composition root of a project page (the villa and every project share it).
// The page names its data file on <body data-catalogue>, relative to public/data/.
const root = document.getElementById('villa-content');
if (!root) throw new Error('#villa-content not found');
const dataFile = document.body.dataset.catalogue ?? 'villa-wood.json';

new JsonVillaRepository(httpFetcher(`${import.meta.env.BASE_URL}data/`), dataFile)
  .load()
  .then((villa) => renderVilla(root, villa))
  .catch((error: unknown) => renderVillaError(root, error));
