// lib/crowley-cards.js
// Crowley Thoth Tarot — die 22 Grossen Arkana (0-21)
// Mit Crowley-spezifischen Namen (NICHT Rider-Waite!):
//   - 8 = Adjustment (nicht Strength)
//   - 11 = Lust (nicht Justice)
//   - 14 = Art (nicht Temperance)
//   - 20 = Aeon (nicht Judgement)
//   - 21 = Universe (nicht World)
//   - 1 = Magus (nicht The Magician)

export const CROWLEY_CARDS = {
  0: {
    name: 'Der Narr', english: 'The Fool',
    hebrew: 'Aleph', element: 'Luft', astro: 'Uranus',
    treePath: '11 (Kether → Chokmah)',
    essence: 'Der heilige Sprung ins Unbekannte. Bewusstsein vor jeder Form. Reine Möglichkeit.',
    light: 'Mut, Vertrauen, kindliche Offenheit, Wagnis, schöpferischer Ursprung, freier Geist.',
    shadow: 'Naivität, Verantwortungslosigkeit, sich verlieren im Beliebigen, vor der Welt fliehen.',
    soul: 'Die Reise beginnt. Du betrittst neues Land.',
  },
  1: {
    name: 'Der Magus', english: 'The Magus',
    hebrew: 'Beth', element: 'Merkur', astro: 'Merkur',
    treePath: '12 (Kether → Binah)',
    essence: 'Wille in die Welt übersetzt. Das Wort, das schöpft. Bewusstsein, das die Werkzeuge meistert.',
    light: 'Klarer Wille, Sprachmacht, Vermittlung, Bewusstheit der Mittel, Konzentration.',
    shadow: 'Manipulation, Trickserei, Selbsttäuschung, Worte ohne Substanz, Verschleierung.',
    soul: 'Du hast die Werkzeuge. Sprich, schreibe, schaffe.',
  },
  2: {
    name: 'Die Hohepriesterin', english: 'The Priestess',
    hebrew: 'Gimel', element: 'Mond', astro: 'Mond',
    treePath: '13 (Kether → Tiphareth)',
    essence: 'Der innere Mond. Schleier zwischen den Welten. Wissen das nicht durch Worte kommt.',
    light: 'Intuition, Empfänglichkeit, inneres Hören, Geheimnis, Mysterium der Seele.',
    shadow: 'Verschlossenheit, Abkapselung, Misstrauen, das Geheimnis als Mauer.',
    soul: 'Hör nach innen. Was du dort findest, ist wahrer als jedes laute Wort.',
  },
  3: {
    name: 'Die Herrscherin', english: 'The Empress',
    hebrew: 'Daleth', element: 'Erde', astro: 'Venus',
    treePath: '14 (Chokmah → Binah)',
    essence: 'Schöpferische Fülle. Liebe als Form gebende Kraft. Die nährende Mutter aller Dinge.',
    light: 'Fruchtbarkeit, Schönheit, sinnliche Wärme, Liebe in materieller Form, Schöpfung im Überfluss.',
    shadow: 'Übermass, Verstrickung in Genuss, Bequemlichkeit, Mutter-Hunger, übergriffige Fürsorge.',
    soul: 'Du darfst geniessen, schöpfen, lieben. Die Welt ist zum Berühren da.',
  },
  4: {
    name: 'Der Herrscher', english: 'The Emperor',
    hebrew: 'Heh (od. Tzaddi)', element: 'Feuer', astro: 'Widder',
    treePath: '15 (Chokmah → Tiphareth)',
    essence: 'Ordnung im Chaos. Strukturgebende Vatererfahrung. Souveränität.',
    light: 'Klare Grenzen, Verantwortung, Autorität aus innerer Stärke, Stabilität, Struktur.',
    shadow: 'Tyrannei, Starrheit, Kontrolle aus Angst, Machtmissbrauch, harter Vater.',
    soul: 'Setze deinen Stuhl. Werde Herr deines Lebens.',
  },
  5: {
    name: 'Der Hierophant', english: 'The Hierophant',
    hebrew: 'Vav', element: 'Erde', astro: 'Stier',
    treePath: '16 (Chokmah → Chesed)',
    essence: 'Brücke zwischen Himmel und Erde. Der Lehrer der das Sakrale ins Alltägliche bringt.',
    light: 'Spirituelle Tradition, Weisheitsweitergabe, Lehrer:innenrolle, das Heilige im Gewöhnlichen, Initiation.',
    shadow: 'Dogma, blinder Gehorsam gegen Autorität, religiöse Erstarrung, Bevormundung.',
    soul: 'Du sitzt im Lehrstuhl deines eigenen Weges. Andere kommen und lernen von dir.',
  },
  6: {
    name: 'Die Liebenden', english: 'The Lovers',
    hebrew: 'Zayin', element: 'Luft', astro: 'Zwillinge',
    treePath: '17 (Binah → Tiphareth)',
    essence: 'Entscheidung aus dem Herzen. Vereinigung der Gegensätze. Sakrale Beziehung.',
    light: 'Tiefe Bindung, bewusste Wahl, Liebe als Erkenntnis, harmonische Polarität.',
    shadow: 'Unentschiedenheit, Zerrissenheit zwischen Möglichkeiten, Verschmelzung, Selbstverlust.',
    soul: 'Wähle. Nicht zwischen Optionen, sondern für das was du bist.',
  },
  7: {
    name: 'Der Wagen', english: 'The Chariot',
    hebrew: 'Cheth', element: 'Wasser', astro: 'Krebs',
    treePath: '18 (Binah → Geburah)',
    essence: 'Bewegtes Gleichgewicht. Sieg durch innere Sammlung. Der Heilige Gral als Gefäss.',
    light: 'Zielstrebigkeit, Disziplin, emotionale Stärke, durchhalten, schützender Panzer.',
    shadow: 'Verbissenheit, Rückzug in Panzer, emotionale Härte, Triebkraft ohne Richtung.',
    soul: 'Du trägst etwas Heiliges. Bewege dich vorwärts ohne es zu vergiessen.',
  },
  8: {
    name: 'Anpassung', english: 'Adjustment',
    hebrew: 'Lamed', element: 'Luft', astro: 'Waage',
    treePath: '22 (Geburah → Tiphareth)',
    essence: 'Karmisches Gleichgewicht. Wahrheit jenseits aller Wertung. Justierung der Seele.',
    light: 'Fairness, klares Urteil, karmisches Reifen, Wahrheit, schwingendes Gleichgewicht.',
    shadow: 'Selbstgerechtigkeit, kaltes Richten, Schuldgefühle, Perfektionismus, Schwarz-Weiss-Denken.',
    soul: 'Was du säst, das erntest du. Setze die Schale wieder ins Lot.',
    note: 'Crowley: 8 = Adjustment (NICHT Strength wie Rider-Waite). Crowley vertauschte 8 und 11 aus kabbalistischen Gründen.',
  },
  9: {
    name: 'Der Eremit', english: 'The Hermit',
    hebrew: 'Yod', element: 'Erde', astro: 'Jungfrau',
    treePath: '20 (Chesed → Tiphareth)',
    essence: 'Inneres Licht in der Stille. Der Weise, der gegangen ist um zu sehen.',
    light: 'Innere Reise, Selbstkenntnis, weise Zurückgezogenheit, Lampe für andere, Reife.',
    shadow: 'Isolation, Weltflucht, Selbstgenügsamkeit als Mauer, sich verstecken.',
    soul: 'Geh nach innen. Das was du dort findest, leuchtet auch nach aussen.',
  },
  10: {
    name: 'Das Glücksrad', english: 'Fortune',
    hebrew: 'Kaph', element: 'Feuer', astro: 'Jupiter',
    treePath: '21 (Chesed → Netzach)',
    essence: 'Das ewige Drehen. Auf und Ab des Lebens. Karma als Spirale.',
    light: 'Wandel, Schicksalsöffnung, Glücksmomente nutzen, Vertrauen in den Lauf.',
    shadow: 'Glücksjagd, Schicksalsgläubigkeit als Ausrede, Passivität, Glücksabhängigkeit.',
    soul: 'Das Rad dreht sich. Heute oben, morgen unten. Bleib dabei.',
  },
  11: {
    name: 'Lust', english: 'Lust',
    hebrew: 'Teth', element: 'Feuer', astro: 'Löwe',
    treePath: '19 (Chesed → Geburah)',
    essence: 'Heilige Lebenskraft. Die Frau auf dem Löwen die das Wilde reitet. Mut der Lebensbejahung.',
    light: 'Sinnliche Lebenslust, kraftvolles Begehren, schöpferische Wildheit, Mut zur Fülle, Lebensjubel.',
    shadow: 'Gier, Sucht, ungebremste Triebkraft, Lust als Flucht, Konsumzwang.',
    soul: 'Reite das Tier in dir. Nicht durch Unterdrückung, sondern durch Liebe.',
    note: 'Crowley: 11 = Lust (NICHT Justice wie Rider-Waite). Crowley vertauschte 8 und 11 aus kabbalistischen Gründen.',
  },
  12: {
    name: 'Der Gehängte', english: 'The Hanged Man',
    hebrew: 'Mem', element: 'Wasser', astro: 'Neptun',
    treePath: '23 (Geburah → Hod)',
    essence: 'Umkehrung der Sicht. Loslassen durch Aufgabe. Initiation durch Stillstand.',
    light: 'Perspektivwechsel, Hingabe, geistige Initiation, Opferbereitschaft als Geschenk.',
    shadow: 'Märtyrertum, Stillstand, sich aufopfern ohne Sinn, Selbstmitleid, Verharren.',
    soul: 'Wenn du loslässt, fängt etwas anderes dich auf.',
  },
  13: {
    name: 'Tod', english: 'Death',
    hebrew: 'Nun', element: 'Wasser', astro: 'Skorpion',
    treePath: '24 (Tiphareth → Netzach)',
    essence: 'Transformation durch Loslassen. Wandlung jenseits der Form. Ende und Neubeginn in einem Atemzug.',
    light: 'Tiefe Wandlung, Befreiung vom Überholten, neue Phase, Erlösung von Altem.',
    shadow: 'Festhalten am Toten, Angst vor Wandel, Depression, Stagnation.',
    soul: 'Was sterben will, lass sterben. Erst dann beginnt das Neue.',
    karmic: true,
  },
  14: {
    name: 'Kunst', english: 'Art',
    hebrew: 'Samekh', element: 'Feuer', astro: 'Schütze',
    treePath: '25 (Tiphareth → Yesod)',
    essence: 'Alchemie der Gegensätze. Wo Feuer und Wasser im Kessel zur dritten Substanz werden.',
    light: 'Integration, Mässigung im Sinne von "richtige Mischung", Synthese, schöpferische Verbindung.',
    shadow: 'Übermässige Vermittlung, Konflikt-Vermeidung, Lauheit, fade Mitte.',
    soul: 'Du mischst die Elemente. Im Kessel deiner Seele wird Neues geboren.',
    note: 'Crowley: 14 = Art (NICHT Temperance/Mässigung wie Rider-Waite). Bei Crowley ist es eine kraftvoll alchemistische Karte.',
    karmic: true,
  },
  15: {
    name: 'Der Teufel', english: 'The Devil',
    hebrew: 'Ayin', element: 'Erde', astro: 'Steinbock',
    treePath: '26 (Tiphareth → Hod)',
    essence: 'Die Materie und ihre Verlockung. Schöpferische Kraft die festgehalten wird. Das Lachen des Pan.',
    light: 'Verkörperung, schöpferische Materie, Humor, Sinnlichkeit, kreative Ungezähmtheit.',
    shadow: 'Materialismus, Sucht, Gefangenschaft im Begehren, Schatten-Verstrickung.',
    soul: 'Die Ketten sind locker. Du kannst sie abstreifen wenn du es siehst.',
  },
  16: {
    name: 'Der Turm', english: 'The Tower',
    hebrew: 'Peh', element: 'Feuer', astro: 'Mars',
    treePath: '27 (Netzach → Hod)',
    essence: 'Blitzschlag in falsche Strukturen. Plötzlicher Zusammenbruch des Künstlichen.',
    light: 'Befreiung durch Zusammenbruch, Wahrheit die alle Lügen zerstört, plötzliche Erleuchtung.',
    shadow: 'Zerstörerische Wut, Trauma, plötzlicher Verlust, Schock, Selbstzerstörung.',
    soul: 'Was zerbricht, war nicht tragfähig. Lass es fallen.',
    karmic: true,
  },
  17: {
    name: 'Der Stern', english: 'The Star',
    hebrew: 'Heh (od. Tzaddi)', element: 'Luft', astro: 'Wassermann',
    treePath: '28 (Netzach → Yesod)',
    essence: 'Heilige Hoffnung. Wasser des Lebens das aus dem Krug fliesst. Die Göttin Nuit.',
    light: 'Hoffnung, Erneuerung, Vertrauen ins Leben, kosmische Inspiration, ruhige Klarheit.',
    shadow: 'Realitätsflucht in Hoffnungs-Bilder, naiver Idealismus, schwammige Visionen.',
    soul: 'Nach dem Turm: schöpfe wieder. Das Wasser fliesst, der Himmel öffnet sich.',
  },
  18: {
    name: 'Der Mond', english: 'The Moon',
    hebrew: 'Qoph', element: 'Wasser', astro: 'Fische',
    treePath: '29 (Netzach → Malkuth)',
    essence: 'Der Weg durch die Nacht. Das Unbewusste, das Atavistische. Tiefe der Seele.',
    light: 'Traumweisheit, intuitive Tiefen, Konfrontation mit dem Schatten, Initiation in die Nacht.',
    shadow: 'Verwirrung, Täuschung, Ängste, Verlorenheit, Depression, Drogen-Verstrickung.',
    soul: 'Geh durch die Nacht. Die Sonne kommt wieder. Was du jetzt siehst, ist wirklich.',
  },
  19: {
    name: 'Die Sonne', english: 'The Sun',
    hebrew: 'Resh', element: 'Feuer', astro: 'Sonne',
    treePath: '30 (Hod → Yesod)',
    essence: 'Strahlendes Bewusstsein. Das Kind in dir, das die Welt mit klaren Augen sieht.',
    light: 'Freude, Klarheit, Lebenslust, kindliche Offenheit, schöpferische Frische, Erleuchtung.',
    shadow: 'Naivität, fehlende Tiefe, Selbstbezogenheit, oberflächliche Heiterkeit.',
    soul: 'Du strahlst. Dein Licht wärmt auch andere.',
    karmic: true,
  },
  20: {
    name: 'Das Äon', english: 'The Aeon',
    hebrew: 'Shin', element: 'Feuer', astro: 'Pluto',
    treePath: '31 (Hod → Malkuth)',
    essence: 'Neues Zeitalter. Die Krönung des Horus. Wiedergeburt in die Verantwortung.',
    light: 'Geistige Wiedergeburt, finale Initiation, Übergang in neues Bewusstsein, kosmische Verantwortung.',
    shadow: 'Apokalyptisches Denken, Endzeit-Drama, Verantwortungsflucht durch Spiritualisierung.',
    soul: 'Du wirst gerufen. Du bist nicht mehr derselbe.',
    note: 'Crowley: 20 = The Aeon (NICHT Judgement). Bei Crowley nicht Gericht, sondern Neuzeitalter (Horus-Aeon).',
  },
  21: {
    name: 'Das Universum', english: 'The Universe',
    hebrew: 'Tav', element: 'Erde/Saturn', astro: 'Saturn',
    treePath: '32 (Yesod → Malkuth)',
    essence: 'Vollendung. Die tanzende Göttin der Welt. Ganzheit jenseits aller Polaritäten.',
    light: 'Vollendung, kosmische Erfüllung, Tanz mit dem Ganzen, integrierte Ganzheit, höchste Reife.',
    shadow: 'Stillstand nach Erfüllung, Schwierigkeit weiterzugehen, Saturn-Schwere.',
    soul: 'Du bist angekommen. Und beginnst neu.',
    note: 'Crowley: 21 = The Universe (NICHT The World). Bei Crowley umfassender — Saturn als Schwellenhüter zur Ganzheit.',
  },
};

// Reduziere mit Zwischenstufen — Tarot-Methode (bis ≤22)
export function reduceForTarot(num) {
  const steps = [num];
  let cur = num;
  while (cur > 22) {
    cur = String(cur).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    steps.push(cur);
  }
  // Wenn ≤22 sind wir an der "ersten Karte" angekommen
  const firstCard = cur;
  // Endkarte: weiter reduzieren auf 1-9 (oder 22 = Fool/0 zählt als 0)
  let endCard = firstCard;
  if (firstCard > 9 && firstCard !== 11 && firstCard !== 22 && firstCard !== 33) {
    endCard = String(firstCard).split('').reduce((a, b) => a + parseInt(b, 10), 0);
  }
  if (firstCard === 22) endCard = 0;
  return { steps, firstCard, endCard };
}

// Block-Summe Berechnung von Datum (DD.MM.YYYY) als Zahl
export function dateBlockSum(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return day + month + year;
}

// Persönliches Jahr via Block-Methode + Tarot-Karten
export function personalYearTarot(dateStr, refYear) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{1,2})[\.\-/](\d{1,2})[\.\-/](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const sum = day + month + refYear;
  const { steps, firstCard, endCard } = reduceForTarot(sum);
  return {
    sum,
    steps: [sum, ...steps.slice(1)],
    firstCard,
    endCard,
    firstCardData: CROWLEY_CARDS[firstCard],
    endCardData: CROWLEY_CARDS[endCard],
  };
}

// Lebenszahl via Block-Methode + Tarot
export function lifeNumberTarot(dateStr) {
  const sum = dateBlockSum(dateStr);
  if (sum === null) return null;
  const { steps, firstCard, endCard } = reduceForTarot(sum);
  return {
    sum,
    steps,
    firstCard,
    endCard,
    firstCardData: CROWLEY_CARDS[firstCard],
    endCardData: CROWLEY_CARDS[endCard],
  };
}

// Helper: short summary of card for prompts
export function cardSummary(num) {
  const c = CROWLEY_CARDS[num];
  if (!c) return '';
  return `${num} — ${c.name} (${c.english}): ${c.essence}`;
}
