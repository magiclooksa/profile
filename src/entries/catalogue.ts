import { httpFetcher } from '../infrastructure/http/jsonFetcher';
import { JsonVillaRepository } from '../infrastructure/repositories/JsonVillaRepository';
import { renderVilla, renderVillaError } from '../presentation/site/villa/VillaPage';
import { initSiteChrome } from '../presentation/site/siteChrome';

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
