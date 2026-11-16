import './styles/tokens.css';
import './styles/base.css';
import './styles/villa.css';
import { httpFetcher } from './infrastructure/JsonProfileRepository';
import { JsonVillaRepository } from './infrastructure/JsonVillaRepository';
import { renderVilla, renderVillaError } from './presentation/villa/VillaPage';
import { Logo } from './presentation/brand';
import { Footer } from './presentation/components/Footer';
import { createSiteSearch } from './presentation/search/SearchPanel';

document.querySelector('.vbar-brand')?.append(Logo('horizontal'));

// The site search, beside the catalogue's own index button.
const search = createSiteSearch('./');
document.getElementById('vbar-index')?.before(search.button);

// Composition root of a project catalogue page (the villa and every project page share it).
// The page names its data file on <body data-catalogue>, relative to public/data/.
const root = document.getElementById('villa-content');
if (!root) throw new Error('#villa-content not found');
const dataFile = document.body.dataset.catalogue ?? 'villa-wood.json';

new JsonVillaRepository(httpFetcher(`${import.meta.env.BASE_URL}data/`), dataFile)
  .load()
  .then((villa) => {
    renderVilla(root, villa);
    document.body.append(Footer({
      name: { ar: 'النظرة الساحرة', en: 'MAGIC LOOK' },
      tagline: 'للتصميم الداخلي والديكور والتأثيث',
      home: 'index.html',
      top: '#cover',
      links: [
        { href: 'index.html#about', label: 'من نحن' },
        { href: 'index.html#services', label: 'خدماتنا' },
        { href: 'index.html#products', label: 'منتجاتنا' },
        { href: 'index.html#collection-1', label: 'أعمالنا' },
        { href: '#cover', label: `كتالوج ${villa.name.ar}` },
      ],
      contactHref: 'index.html#contact',
    }));
  })
  .catch((error: unknown) => renderVillaError(root, error));
