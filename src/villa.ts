import './styles/tokens.css';
import './styles/base.css';
import './styles/villa.css';
import { httpFetcher } from './infrastructure/JsonProfileRepository';
import { JsonVillaRepository } from './infrastructure/JsonVillaRepository';
import { renderVilla, renderVillaError } from './presentation/villa/VillaPage';

// Composition root of the villa catalogue page.
const root = document.getElementById('villa-content');
if (!root) throw new Error('#villa-content not found');

new JsonVillaRepository(httpFetcher(`${import.meta.env.BASE_URL}data/`), 'villa-wood.json')
  .load()
  .then((villa) => renderVilla(root, villa))
  .catch((error: unknown) => renderVillaError(root, error));
