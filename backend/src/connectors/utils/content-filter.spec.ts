import { crossrefSearchQuery, defaultQueryForCategory, filterItemsByQuery, parseSearchSubjects } from './content-filter';

describe('sujets à surveiller séparés par des virgules', () => {
  const items = [
    { title: 'Qualité de l’environnement', summary: 'Analyse de l’eau' },
    { title: 'Guide ISO 17025', summary: 'Laboratoires' },
    { title: 'Un bonbon sucré salé', summary: 'Nouvelle recette' },
    { title: 'Un bonbon sucré', summary: 'Une préparation salée' },
    { title: 'Recrutement', summary: 'Offres d’emploi' },
  ] as never[];

  it('traite chaque expression de plusieurs mots comme un seul sujet, sans guillemets', () => {
    const query = 'environnement, ISO 17025, bonbon sucré salé';
    const result = filterItemsByQuery(items, query);
    expect(result.items).toEqual(items.slice(0, 3));
    expect(result.ignoredCount).toBe(2);
    expect(parseSearchSubjects(query)).toEqual(['environnement', 'iso 17025', 'bonbon sucre sale']);
  });

  it('ignore les espaces, doublons, la casse et les accents', () => {
    expect(filterItemsByQuery(items, ' ENVIRONNEMENT, environnement, BONBON SUCRE SALE ').items)
      .toEqual([items[0], items[2]]);
    expect(filterItemsByQuery(items, '').items).toEqual(items);
  });

  it('propose le même format simple pour chaque catégorie', () => {
    expect(defaultQueryForCategory('ACCREDITATION')).toContain('ISO 17025,');
    expect(defaultQueryForCategory('ENVIRONNEMENT')).toContain('environnement, environment');
    expect(crossrefSearchQuery('ISO 17025, bonbon sucré salé')).toBe('iso 17025 bonbon sucre sale');
  });

  it('lit encore les anciennes configurations enregistrées', () => {
    const query = 'principaux: environnement, "ISO 17025"\nsecondaires: bonbon sucré salé\nexclus: job\nseuil: 4';
    expect(filterItemsByQuery(items, query).items).toEqual(items.slice(0, 3));
  });
});
