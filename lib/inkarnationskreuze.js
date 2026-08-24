// lib/inkarnationskreuze.js
// Inkarnationskreuze · Datenbasis fuer den Human-Design-Track (Familien-Code)
//
// 192 Kreuze = 64 Sonne-Persoenlichkeitstore x 3 Winkel.
// Eindeutiger Schluessel: Sonne-Persoenlichkeitstor + Winkel.
// Der Winkel folgt dem Profil:
//   rechts (Right Angle) .... 1/3 1/4 2/4 2/5 3/5 3/6 4/6
//   juxta  (Juxtaposition) .. 4/1
//   links  (Left Angle) ..... 5/1 5/2 6/2 6/3
//
// tore = [Sonne Persoenlichkeit, Erde Persoenlichkeit, Sonne Design, Erde Design]
// quelle = deutsche Rohfassung (DeepL-Uebersetzung, redaktionell bereinigt).
//          NICHT woertlich in den Report ausgeben. Sie geht als Deutungsmaterial
//          in den Prompt; das Modell formuliert daraus in der Zielsprache.
//
// Nur serverseitig verwenden (lib/humandesign.js) - die Datei ist ~130 KB.

const WINKEL = ['rechts', 'juxta', 'links'];

const WINKEL_LABEL = {
  rechts: { de: 'Rechtswinkliges Kreuz', en: 'Right Angle Cross', pt: 'Cruz de Angulo Reto' },
  juxta:  { de: 'Juxtapositionskreuz',   en: 'Juxtaposition Cross', pt: 'Cruz de Justaposicao' },
  links:  { de: 'Linkswinkliges Kreuz',  en: 'Left Angle Cross',  pt: 'Cruz de Angulo Esquerdo' },
};

const WINKEL_KURZ = {
  rechts: {
    de: 'persoenliches Schicksal · der eigene Weg steht im Zentrum',
    en: 'personal destiny · the individual path is central',
    pt: 'destino pessoal · o proprio caminho esta no centro',
  },
  juxta: {
    de: 'fixiertes Schicksal · ein Thema wird unbeirrt gelebt',
    en: 'fixed destiny · one theme is lived without deviation',
    pt: 'destino fixo · um tema e vivido sem desvio',
  },
  links: {
    de: 'transpersonales Schicksal · die Wirkung entsteht durch andere',
    en: 'transpersonal destiny · the impact unfolds through others',
    pt: 'destino transpessoal · o efeito acontece atraves dos outros',
  },
};

const PROFIL_WINKEL = {
  '1/3': 'rechts', '1/4': 'rechts', '2/4': 'rechts', '2/5': 'rechts',
  '3/5': 'rechts', '3/6': 'rechts', '4/6': 'rechts',
  '4/1': 'juxta',
  '5/1': 'links', '5/2': 'links', '6/2': 'links', '6/3': 'links',
};

const TOR_NAMEN = {
  1: "Selbstausdruck",
  2: "Höheres Wissen",
  3: "Ordnung",
  4: "Formulierung",
  5: "Feste Rhythmen",
  6: "Reibung",
  7: "Die Rolle des Selbst",
  8: "Beitrag",
  9: "Fokus",
  10: "Verhalten des Selbst",
  11: "Ideen",
  12: "Vorsicht",
  13: "Zuhörer",
  14: "Macht-Fähigkeiten",
  15: "Extreme",
  16: "Geschicklichkeit",
  17: "Meinungen",
  18: "Berichtigung",
  19: "Wollen",
  20: "Das Jetzt",
  21: "Der Jäger/die Jägerin",
  22: "Offenheit",
  23: "Assimilation",
  24: "Rationalisieren",
  25: "Der Geist des Selbst",
  26: "Der Egoist",
  27: "Fürsorge",
  28: "Der Spielmacher",
  29: "Ja-Sagen",
  30: "Erkennen von Gefühlen",
  31: "Führen",
  32: "Kontinuität",
  33: "Privatsphäre",
  34: "Macht",
  35: "Veränderung",
  36: "Krise",
  37: "Freundschaft",
  38: "Der Kämpfer",
  39: "Der Provokateur",
  40: "Alleinsein",
  41: "Zusammenziehen",
  42: "Wachstum",
  43: "Einsicht",
  44: "Wachsamkeit",
  45: "Sammler",
  46: "Die Entschlossenheit des Selbst",
  47: "Erkennen",
  48: "Tiefe",
  49: "Prinzipien",
  50: "Werte",
  51: "Schock",
  52: "Untätigkeit",
  53: "Anfänge",
  54: "Ehrgeiz",
  55: "Geist",
  56: "Anregung",
  57: "Intuitive Einsicht",
  58: "Lebendigkeit",
  59: "Sexualität",
  60: "Akzeptanz",
  61: "Mysterium",
  62: "Detail",
  63: "Zweifel",
  64: "Verwirrung",
};

const KREUZE = {
  1: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Sphinx 4",
      tore: [1, 2, 7, 13],
      quelle: "Sie sind hier, um Ihrer eigenen Führung zu folgen und im Moment zu sein. Sie sind fixiert auf das Jetzt und Ihre Art, die Dinge zu tun. Diese Selbstversunkenheit ist Ihr individueller Beitrag zur Welt. Es ist zwar nicht Ihre Absicht, anderen die Richtung vorzugeben, aber Sie tun es. Indem Sie Ihrem Herzen folgen und Ihr eigenes ausdrucksstarkes Ding machen, können andere durch Ihr Beispiel eine Richtung finden und werden Ihnen folgen. Ziehen Sie Ihr eigenes Ding durch und stellen Sie sicher, dass es bis ins Mark Ihre Leidenschaft ist.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Selbstausdrucks",
      tore: [1, 2, 4, 49],
      quelle: "Ihr Kreuz hat die Energie des Selbstausdrucks. Sie sind hier, um anders zu sein und Ihr eigenes Ding zu machen. Durch den individuellen Ausdruck kann der Rest von uns zusehen und sich an die neuen Ideen anpassen, mit denen wir eine Resonanz spüren. Verstehen Sie jedoch, dass Individualismus nicht immer anpassungsfähig ist und mancher Selbstausdruck andere vertreiben wird. Das liegt in der Natur der Energie, und sie ist nicht persönlich.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Trotzes 2",
      tore: [1, 2, 4, 49],
      quelle: "Ihr Kreuz bringt die Energie, die sich gegen kontrollierende Einflüsse wehrt. Sie sind hier, um den Selbstausdruck zu verkörpern. Es wird Menschen geben, die versuchen, Ihnen Regeln aufzuerlegen, wie Sie das tun können. Deine Energie ist es, diesen Regeln zu trotzen, denn wie kann jemand dem Selbstausdruck Grenzen setzen? Sie sind hier, um sicherzustellen, dass Ihr Ausdruck eine Stimme hat, und niemand kann das einschränken.",
    },
  },
  2: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Sphinx 2",
      tore: [2, 1, 13, 7],
      quelle: "Die Energie dieses Kreuzes besteht darin, zu sehen und offen für die Möglichkeiten zu sein. Du bist hier, um uns zu führen, indem du uns die vielen möglichen Richtungen und Wege zeigst, eine schöne Welt zu erschaffen. Du zeigst die vielen möglichen Wege auf, die wir wählen können, oder gibst Vorschläge für alternative Routen. Sie können jedoch Schwierigkeiten haben zu erklären, warum wir die vorgeschlagene Route nehmen sollen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Fahrers",
      tore: [2, 1, 49, 4],
      quelle: "Die Energie Ihres Kreuzes wird Ihnen eine Richtung in Ihrem Leben geben. Diese Richtung wird damit verbunden sein, die Wahrheit zu entdecken - Ihre Wahrheit, die Wahrheit der Menschen um Sie herum und vielleicht universelle Wahrheiten. Diese Energie wird Ihnen eine konsequente Richtung in Ihrem Leben geben und Sie werden versuchen, die Menschen um Sie herum in Richtung dieser Bestimmung, die Wahrheit zu erkennen, zu ziehen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Trotzes",
      tore: [2, 1, 49, 4],
      quelle: "Ob Sie sich dieser Energie bewusst sind oder nicht, Sie sind hier, um aus der Reihe zu tanzen und die \"andere\" Art, Dinge zu tun, zu repräsentieren. Ihre gefühlte Auflehnung kann klein oder gross sein, aber Ihr Ziel ist es, Abweichungen von der Norm zu bewirken. Meistens wird dies dazu führen, dass leichte Abweichungen in die Akzeptanz kommen. Dies geschieht nicht durch Ihr Handeln, sondern durch die Wahrnehmung Ihres Handelns durch andere. Auf diese Weise verleihen Sie der Gesellschaft Ihr Design, indem Sie an den Dingen feilen, die festgefahren sind und eine Veränderung brauchen, um besser zu werden.",
    },
  },
  3: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Gesetzmässigkeiten",
      tore: [3, 50, 60, 56],
      quelle: "Sie haben die Energie, die Sie antreibt, Gesetze zu haben. Als kleines Kind mit diesem Kreuz, wenn es in Ihrem Haus keine Regeln und Gesetze gab, haben Sie das Szenario vielleicht als störend empfunden. Bei diesem Kreuz geht es darum, die Gesetze des Stammes auszuleben. Die Blei-Energie hat mutative Qualitäten, es gibt also den Drang, die Gesetze zu verbessern, aber es ist keine revolutionäre Energie. Die Blei-Energie hat eher den Charakter einer allmählichen Veränderung, da das Gesetz Grenzen hat. Wenn sich diese Begrenzungen drastisch ändern würden, würde sich das wie Chaos anfühlen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Mutation",
      tore: [3, 50, 41, 31],
      quelle: "Dieses Kreuz trägt die Energie, Mutation oder Veränderung zu bewirken. Diese Veränderungen sind im Allgemeinen mit Regeln oder Gesetzen verbunden. Es kann ein gewisses moralisches Urteil geben, denn jedes Mal, wenn Sie versuchen, Gesetze zu ändern, können Sie als Dissident wahrgenommen werden. Wenn Sie die Veränderung aus der Position der Macht heraus vornehmen, können Sie als korrupt wahrgenommen werden. Aber Sie sind hier, um eine mutative Kraft bei der Änderung der Stammesregeln und Gesetze zu sein.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Wünsche",
      tore: [3, 50, 41, 31],
      quelle: "Ihr Kreuz hat die Energie, die Führung für Veränderungen in der Gesetzgebung und der Art und Weise, wie die Dinge funktionieren, zu übernehmen. Dies wird immer zu Spannungen führen, da es immer diejenigen geben wird, die sich wünschen, dass die Dinge so bleiben wie sie sind, und diejenigen, die sich eine Veränderung wünschen. Bei diesem Kreuz geht es um das Wünschen und Hoffen auf eine bessere Zukunft. Sie sind hier, um diesen Wunsch für die Zukunft zu äussern und eine gewisse Führungsrolle zu übernehmen, damit dies geschieht.",
    },
  },
  4: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Erläuterung 3",
      tore: [4, 49, 23, 43],
      quelle: "Ihr Kreuz wird von der Energie des 4. Tores angetrieben, das \"die Antwort\" ist, aber diese Antwort ist eigentlich nur eine Theorie, die ausgedrückt und dann verifiziert werden muss. Sie sind hier, um Ihre Theorien zu erklären, und das ist eine kleine Herausforderung. Die Erklärung, die Sie geben, wird individualistisch sein, und damit eine logische Theorie akzeptiert wird, muss sie an das Kollektiv appellieren. Ihre Aufgabe ist es, dem Rest von uns eine ungewöhnliche Erklärung zu geben, eine, die den meisten von uns nicht einfallen würde. Es ist diese Energie, die das Kollektiv aus einem falschen Glauben (die Welt ist flach) oder einer schwierigen Situation (globale Erwärmung) herausholt. Dann liegt es an der Gesellschaft, zu entscheiden, ob es brillant oder bizarr ist. Nehmen Sie es nicht persönlich, wenn Ihre Idee(n) als bizarr angesehen werden, das ist nur der Tanz zwischen kollektiver und individueller Energie.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Formulierung",
      tore: [4, 49, 8, 14],
      quelle: "Sie sind hier, um Ihre Theorien über Muster und Formeln auszudrücken, die Dinge erklären. Sie sind nicht hier, um sie zu untermauern, sondern um sie für den Rest von uns darzulegen, damit wir darüber rätseln können. Die Energie Ihres Kreuzes liefert die geistige Fähigkeit, diese Formeln zu sehen, und Ihre Hauptaufgabe ist es, sie auszudrücken und dann loszulassen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Revolution 2",
      tore: [4, 49, 8, 14],
      quelle: "Bei Ihrem Kreuz geht es um eine Revolution, die praktisch ist. Wenn das Muster der Revolution passt und durch Fakten gestützt wird, dann ist es eine Veränderung, in die Sie bereit sind zu investieren. Wenn es dagegen eine gute Theorie ist, aber es gibt nichts, worauf man sich stützen kann, dann werden Sie es sein lassen. Sie sind hier, um praktische Veränderungen vorzunehmen.",
    },
  },
  5: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Bewusstseins 4",
      tore: [5, 35, 64, 63],
      quelle: "Sie sind hier, um im Fluss des Lebens zu sein. Das ganze Leben besteht aus Mustern, die im Fluss der Zeit tanzen. Ihre Energie ist die Grundlage dieser Muster. Sie haben eine angeborene Gabe zu verstehen, dass es um die Muster im Leben, in der Natur und im Universum geht. Wenn wir mit dem Fluss gehen, dann ist unsere Energie für das Erleben der Dinge reserviert, die sich in und aus unserem Leben bewegen, und wird nicht damit verbracht, den Strom zu bekämpfen. Sie sind hier, um in dieser Hinsicht weise zu sein und Ihre Erleuchtung mit anderen zu teilen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Gewohnheiten",
      tore: [5, 35, 47, 22],
      quelle: "Ihr Kreuz bringt die Energie von Mustern und Gewohnheiten mit sich, und Sie sind hier, um einen starken Einfluss auf diese Muster zu nehmen. In Ihrem Fall wird es in Bezug auf Ihre eigenen Muster sein, die für Sie wie Rituale sind. Zum Beispiel haben Sie vielleicht Muster, wie oft Sie sich die Zähne putzen, welchen Bus Sie zur Arbeit nehmen, wie lange Sie zu Mittag essen. Manchmal sind Sie vielleicht sehr starr in diesen Dingen, aber was Sie dem Rest der Welt anbieten, ist, dass Sie durch Muster einen individuellen Rhythmus finden können. Ohne Muster wäre das Leben chaotisch. Sie helfen, die Kraft des Rhythmus im Leben zu demonstrieren.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Trennung 2",
      tore: [5, 35, 47, 22],
      quelle: "Ihr Kreuz hat die Energie, die zu ihrem eigenen Takt marschieren will. Das ist eine Energie, die nach Mustern und Rhythmen sucht, die für Sie funktionieren und nicht unbedingt für andere. In diesem Kreuz geht es um Trennung, denn auf Ihrer Reise werden Sie feststellen, dass die Muster anderer Leute nicht für Sie funktionieren. Die Welt braucht Menschen, die sich in ihrem eigenen Rhythmus bewegen. Es gibt zum Beispiel die Mainstream-Arbeitskraft und dann gibt es das Bedürfnis der anderen, die Leere drumherum auszufüllen, das kann eine Freischicht- oder Zeitarbeitsposition sein oder einfach Ihr eigenes Ding zu machen. Ihr Muster ist wichtig für Sie und es ist Ihr Sinn für Individualität, den Sie der Welt anbieten.",
    },
  },
  6: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Eden 3",
      tore: [6, 36, 12, 11],
      quelle: "Sie wurden also aus dem Garten Eden geworfen, oder zumindest mag sich die Geburt für Sie so angefühlt haben. Viele, die dieses Kreuz tragen, kommen nur widerwillig auf die Welt, da der Mutterleib alles bietet, was benötigt wird. Mit der Zeit tragen Sie die Energie, hinauszugehen und die Welt zu erkunden und das Leben zu leben. Letztendlich geht es bei Ihrer Energie um Erkundung, nicht um den Weg zurück nach Eden, sondern darum, sich vorwärts zu bewegen und ein Stückchen Eden hier auf der Erde zu finden und es dann mit denen um Sie herum zu teilen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Konflikts",
      tore: [6, 36, 15, 10],
      quelle: "Die Energie, die Sie in dieses Leben einbringen, besteht darin, durch die Beziehungen, die Sie aufbauen, Ihre Chance zu finden. Der Konflikt, den Sie aushalten müssen, besteht darin, ein Gleichgewicht zu finden zwischen dem Gefühl, aus dem Garten Eden hinausgeworfen worden zu sein, und der Freude, auf der irdischen Ebene zu leben. Ein Teil von Ihnen wird um das verlorene Eden kämpfen und der andere wird in der Freude des Lebens schwelgen. Nutzen Sie Ihre Beziehungen, um die Möglichkeit zu finden, Freude in Ihr Leben zu bringen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ebene 2",
      tore: [6, 36, 15, 10],
      quelle: "Sie sind hier, um ein irdischer Führer zu sein. In der Energie Ihres Kreuzes geht es um das Leben auf der irdischen Ebene. Sie sind hier, um zu lehren und ein Beispiel dafür zu sein, dass wir das bekommen, was wir brauchen, wenn wir uns an unserem menschlichen Design ausrichten. Vielleicht nicht das, was unser Verstand denkt, dass wir brauchen, sondern das, was unser Körper und unsere Seele brauchen. Sie sind hier, um der Hüter eines erfolgreichen Lebens auf der Erde in dieser materiellen Welt zu sein.",
    },
  },
  7: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Sphinx 3",
      tore: [7, 13, 2, 1],
      quelle: "Als Kreuz der Sphinx bringen Sie Führungsqualitäten mit, die Sie leiten und lenken, da Ihre Energie die Vision für die Zukunft unterstützt. Dies ist wahrscheinlich das aktivste Kreuz, das nach Führung strebt, aber der Antrieb zur Führung in Ihnen wird von Ihrem Profil und der restlichen Zusammensetzung Ihres Horoskops abhängen. Grundsätzlich haben Sie die Fähigkeit, auf vergangene Muster zu schauen und zu projizieren, wohin sie sich bewegen werden. Dies ist Ihr grösstes Kapital, das Sie in Ihrer Führungsrolle zur Geltung bringen können.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Interaktion",
      tore: [7, 13, 23, 43],
      quelle: "Ihr Kreuz wird dazu angetrieben, an der Führung beteiligt zu sein. Das bedeutet nicht unbedingt, die Führung zu übernehmen, sondern kann sich als individueller Beitrag zu etwas Grösserem manifestieren. Sie fühlen sich gezwungen, in der Politik oder anderen Organisationen, die Führung bieten, einen Fuss in der Tür zu haben. Ihr Kreuz trägt Tore der Führung, um Sie in diesem Bestreben zu unterstützen, und Ihr Profil der vierten Linie kann dazu beitragen, durch Ihr soziales Netzwerk Möglichkeiten zu schaffen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Masken 2",
      tore: [7, 13, 23, 43],
      quelle: "Von Ihrem Kreuz wird erwartet, dass Sie die Führung übernehmen, wenn ein dringender Bedarf besteht, dass jemand vortritt und eine Lösung anbietet. Mit dieser Energie wird von Ihnen erwartet, dass Sie sich durchsetzen und den Tag retten. Vorbereitung ist der Schlüssel für Sie, denn die Erwartungen sind gross. Stellen Sie sicher, dass Sie für die anstehende Aufgabe bereit sind, oder lehnen Sie sie ab, da die Konsequenzen eines Versagens gross sein könnten.",
    },
  },
  8: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Ansteckung 2",
      tore: [8, 14, 30, 29],
      quelle: "Die Energie Ihres Kreuzes besteht darin, durch Ihren individuellen Einsatz einen Beitrag zu leisten. Ihre Leidenschaft und Ihr Ausdruck von Begeisterung ist ansteckend und inspiriert andere, Ihrer Führung zu folgen Diese Energie bedeutet, dass es unwahrscheinlich ist, dass Sie der Anhänger anderer sein werden, zumindest nicht auf dem ganzen Weg. Irgendwann werden Sie auf eigene Faust losziehen und neue Wege beschreiten. Wenn Sie das tun, erzeugt das die Energie für andere, sich an Ihren Ideen zu orientieren und die Welle mitzunehmen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Beitrags",
      tore: [8, 14, 55, 59],
      quelle: "Die Energie dieses Kreuzes besteht darin, Ihren Beitrag zur Gesellschaft durch Demonstration zu leisten. Zum Beispiel gibt es in dem Film \"It's a Wonderful Life\" einen nicht zu leugnenden Drang zwischen George und Mary, zu heiraten, das alte Haus zu kaufen und ihr Leben damit zu verbringen, es ständig zu renovieren. Auch Sie haben den Drang, ein Projekt zu adoptieren und es unter Ihre Fittiche zu nehmen, indem Sie es reparieren und besser machen. Dies ist Ihr Beitrag zur Gesellschaft.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ungewissheit",
      tore: [8, 14, 55, 59],
      quelle: "Die Energie dieses Kreuzes versorgt Sie mit dem Wunsch, das richtige Haus, das richtige Grundstück und alle möglichen schönen Dinge zu bekommen. Die zugrundeliegende Unsicherheit dieses Kreuzes besteht in der Frage: \"Habe ich das richtige (Haus, Auto, Grundstück, Geldbeutel, Schuhe usw.)? Alle Menschen mit dem Kreuz der Ungewissheit im linken Winkel haben das 55. Tor, das Melancholie und die Welle von Freude zu Traurigkeit und zurück repräsentiert. Der Trick, dieses Kreuz zu leben, besteht darin, zu erkennen, dass der Wechsel von Traurigkeit zu Freude eine Welle ist und immer sein wird. Erkennen Sie, dass, wenn Sie Melancholie fühlen, die Freude kommt. Durch dieses Bewusstsein und diesen Fokus bringen Sie Glück in Ihr Leben. Wenn sich Ihre Entscheidungen mit der Zeit richtig anfühlen, wissen Sie, dass Sie die richtige Wahl getroffen haben.",
    },
  },
  9: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Planung 4",
      tore: [9, 16, 40, 37],
      quelle: "Sie sind hier, um einen Beitrag zur Planung für Ihre Familie, Gruppe oder Gemeinschaft zu leisten. Sie haben die Energie, sich die Details anzusehen und sich auf das zu konzentrieren, was getan werden muss. Es geht Ihnen nicht darum, zu bestimmen, woher die Energie oder die finanziellen Mittel kommen sollen, denn dafür ist jemand anderes zuständig. Ihre Fähigkeit, zu planen, basiert auf den Prioritäten der Gruppe, mit der Sie arbeiten. Ihr Fokus liegt auf den Zielen, nicht auf den Mitteln.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Fokus",
      tore: [9, 16, 64, 63],
      quelle: "Sie sind mit der Energie angetrieben, den Fokus in den Dingen zu finden, vor allem rund um die Planung. Wie ein Reisebüro können Sie durch das Internet rasen und versuchen, alle logischen Möglichkeiten zu finden. Das ist jedoch nicht immer die produktivste Art und Weise, wie diese Energie arbeitet. Ihr Entwurf wird eher den Fokus finden, wenn Sie sich in die Aufgabe hinein entspannen und zulassen, dass der Fokus mit der Zeit zum Vorschein kommt. Um das Beispiel des Reisebüros aufzugreifen: Anstatt die Dinge logisch auszuarbeiten, sollten Sie eine eher zen-artige Herangehensweise wählen und zulassen, dass sich die Teile auf natürliche Weise zusammenfügen. Mit dieser entspannten Methode werden Sie den Fokus am erfolgreichsten finden und Ihren Beitrag zu allem leisten, was Sie tun.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Identifikation 2",
      tore: [9, 16, 64, 63],
      quelle: "Ihr Kreuz trägt die Energie, sich zu konzentrieren und einen grossen Beitrag zu leisten. Ihre Fähigkeit, sich zu konzentrieren und einen starken Beitrag zu leisten, ist direkt mit den Belohnungen und der Sicherheit verbunden, die Sie erhalten. Ihre Zeichnung ist nicht gut geeignet für eine spekulative Karriere, bei der Sie anstelle eines Einkommens Aktien oder einen möglichen zukünftigen Bonus erhalten. Sie sind keine Person für Google in der Anfangszeit, da Sie die Stabilität in der Hand brauchen. Mit dieser Stabilität können Sie bei allem, was Sie tun, einen enormen Fokus setzen und einen grossen Beitrag leisten.",
    },
  },
  10: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Gefässes der Liebe 4",
      tore: [10, 15, 46, 25],
      quelle: "Die Energie des Kreuzes basiert auf der Liebe. Liebe zum Geist, Liebe zum Körper, Liebe zur Menschheit und Liebe zum Selbst. Sie sind die Verkörperung der Liebe. Ihre Liebe treibt Sie an, die Selbstliebe zu finden. Ihr Kreuz sucht nach einem Weg, sich als individuelles Beispiel der Liebe für alle sichtbar auszudrücken.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Verhaltens",
      tore: [10, 15, 18, 17],
      quelle: "Ihr Kreuz hat die Energie, das Verhalten anderer zu lenken und zu korrigieren. Diese Energie beinhaltet Meinungen, um den logischen Prozess zu bewerten, und Korrekturen, um die Art und Weise, wie er durchgeführt wird, zu verbessern. Der Zweck ist, zu einer besseren Art und Weise zu gelangen, die Dinge zu tun und mehr Freude am Leben zu bringen. Machen Sie sich jedoch bewusst, dass die Menschen, die Sie korrigieren und anleiten, Ihre Vorschläge nicht immer mögen werden. Achten Sie darauf, dass Sie Ihrem Human Design Typ und Ihrer Strategie folgen, wenn Sie sich auf Ihren Korrekturprozess einlassen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Prävention 2",
      tore: [10, 15, 18, 17],
      quelle: "Ihr Kreuz trägt die Energie, Verhalten zu untersuchen. Sie analysieren das Verhalten und geben dann Kommentare ab, um es zu korrigieren. Die treibende Kraft hier ist es, Not oder Schaden zu verhindern, indem man das Verhalten korrigiert und abschneidet, bevor potenzielles Unheil geschieht. Diese Energie kann manchmal ein wenig urteilend und diktatorisch sein. Achten Sie darauf, was Sie sagen, denn es wird effektiver sein, wenn Sie es manchmal abmildern. Sie sind hier, um anderen zu helfen, potentiell schädliches Verhalten zu vermeiden, indem Sie korrigieren, was riskant erscheint und applaudieren, was gut erscheint.",
    },
  },
  11: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Eden 4",
      tore: [11, 12, 6, 36],
      quelle: "Wir kommen aus der feinstofflichen Welt in den Körper, die eine Leichtigkeit und einen Mangel an Dichte hat. Diese Welt ist dicht und hat eine Schwere an sich. Ihr seid hier, um zu erziehen und die Bedeutung der Körpererfahrung weiterzugeben. Ihr kommt mit dem Kreuz von Eden und seid hier, um diese Philosophie auszudrücken, während ihr im Körper seid. Einige können dazu neigen, von der Schwere niedergedrückt zu werden, und andere können sich bewegen, um die Wichtigkeit, im Körper zu sein, auszudrücken und wie man sie auslebt. Sie können das emotionale Schwanken zwischen diesen beiden Standpunkten erleben.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Ideen",
      tore: [11, 12, 46, 25],
      quelle: "Sie neigen dazu, Ihre Ideen zum Ausdruck zu bringen. Die Energie Ihres Kreuzes unterstützt philosophierende und ordnende Gedanken, besonders über das körperliche Sein. Hier geht es um die körperliche Erfahrung des Menschseins. Sie haben die Energie, zu lehren oder ein Prophet zu sein und zu der Welt zu sprechen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Bildung 2",
      tore: [11, 12, 46, 25],
      quelle: "Sie haben das Kreuz der Bildung und die Energie, die den Wert der Bildung unterstützt. Sie sind dazu bestimmt, ein Befürworter der Bildung zu sein, denn sie ist ein Mittel, mit dem wir ein besseres Verständnis dafür erlangen, wer wir sind. Wenn wir verstehen, wer wir sind, haben wir die Chance, uns weiterzuentwickeln. Bildung ist die Grundlage dieser Entwicklung, und Sie sind hier, um daran beteiligt zu sein und zu helfen, sie allen zugänglich zu machen.",
    },
  },
  12: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Eden 2",
      tore: [12, 11, 36, 6],
      quelle: "Ihr Kreuz hat die Energie und den Antrieb, die Welt zu erkunden - aber es geht nicht nur um Sie. Dies ist die Energie, die Sie dazu zwingt, andere auf Ihre Erkundung mitzunehmen. Dies ist die Kraft, die uns aus dem Garten Eden herausgeführt hat. Diese Energie hat auch eine Verbindung zur Kunst und dazu, Ausdruck in Form zu bringen. Dieses Kreuz kann eine Phase der Traurigkeit durchlaufen, da es in der Welt vieles gibt, was nicht Eden-ähnlich ist. Aber fürchten Sie nicht den Drang zu führen oder zu teilen. Ihr Sinn für Erforschung wird durchkommen, denn dazu sind Sie hier.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Artikulation",
      tore: [12, 11, 25, 46],
      quelle: "Ihr Kreuz trägt eine besondere Energie, um das Wort verbreiten zu können. Deine Energie bezieht sich nicht nur auf die Artikulation der Worte, sondern auch auf die Energie der Liebe innerhalb der Botschaft. Sie haben die Gabe, die Menschen um Sie herum mit dem anzustecken, was Sie sagen. Nutzen Sie Ihre Gabe, um in allem, was Sie tun, eine Veränderung zum Besseren zu bewirken.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Bildung",
      tore: [12, 11, 25, 46],
      quelle: "Sie sind hier, um auf dem Weg des Vortrags zu erziehen. In Ihrem Stil geht es nicht wirklich um das Teilen, sondern eher um das Erklären für die Massen, die bereit sind, Ihre Botschaft zu hören. Wenn Sie innerhalb Ihres Typs und Ihrer Strategie leben, werden Sie ein Publikum finden, das offen und aufnahmebereit ist, um zu hören, was Sie zu sagen haben. Sie sind hier, um das Wort zu überbringen, auf welchem Gebiet auch immer Sie eine Leidenschaft haben.",
    },
  },
  13: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Sphinx",
      tore: [13, 7, 1, 2],
      quelle: "Sie sind hier, um intuitiv über die Vergangenheit zu sprechen. Sie sind hier, um eine Anleitung zur Versöhnung mit der Vergangenheit zu geben, indem Sie die Geschichte aufnehmen, um aus dem, was bereits geschehen ist, einen Ratschlag herauszuziehen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Zuhörens",
      tore: [13, 7, 43, 23],
      quelle: "Sie sind hier, um zuzuhören und die Geschichte der Ereignisse und Episoden in diesem Leben zu sammeln. Diese Konfiguration ist jedoch nicht dazu geeignet, diese Geschichte zum Ausdruck zu bringen. Es ist eine Geschichte, ein Ereignis oder ein Geheimnis, das nur sehr wenige jemals erfahren werden. Sie haben grosse Fähigkeiten als Zuhörer, und es gibt viele Möglichkeiten, dieses Talent zu nutzen. Anwälte, Ärzte und Psychologen nutzen diese Fähigkeit, um ihren Klienten zu helfen und gleichzeitig ihre Informationen vertraulich zu behandeln.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Masken",
      tore: [13, 7, 43, 23],
      quelle: "Als das linke Winkelkreuz der Masken sind Sie hier, um die Vergangenheit zu betrachten und durch Ihren eigenen mutativen Prozess eine Richtung vorzugeben. Sie tragen die Masken, weil auf Ihnen der Druck lastet, Richtung zu geben. Manchmal kann diese Erwartung dazu führen, dass Sie Melancholie erleben, da Ihr Kreuz eine individuelle Energie ausdrückt, die nach der höheren Liebe mit dem anderen sucht. Die Wendung ist, dass es bei Ihrer individuellen Energie um den individuellen Ausdruck geht, was manchmal schwierig sein kann, wenn Sie versuchen, andere zu lieben, einfach weil es dann nicht mehr nur individuell ist. Erinnert Euch daran, dass Ihr, um die Liebe zu finden, die Reise alleine antreten müsst, sonst hättet Ihr bereits Liebe. Dies ist Ihr mutativer Prozess, den Sie für andere demonstrieren.",
    },
  },
  14: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Ansteckung 4",
      tore: [14, 8, 29, 30],
      quelle: "Ihr Kreuz hat die Energie, gut versorgt zu sein. Sie haben auch die Energie, \"Ja\" zu sagen und Verpflichtungen einzugehen. Ihre energetische Konstitution wird Ihnen immer die notwendigen Ressourcen zuführen, aber Ihr Wunsch, \"Ja\" zu sagen, kann Sie überfordern und zum Ausbrennen führen. Sie müssen Ihrem Human Design Typ und Ihrer Strategie folgen und sicherstellen, dass Ihre Verpflichtungen Dinge betreffen, für die Sie eine Leidenschaft haben. Menschen werden von Ihnen angezogen, um Ihre reichhaltigen Ressourcen zu erleben. Stellen Sie sicher, dass Sie Ihre Energien für Dinge einsetzen, die auf Ihrer Seelenebene eine Bedeutung haben.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Ermächtigung",
      tore: [14, 8, 59, 55],
      quelle: "Sie haben das energetische Design, um in diesem Leben zu bekommen, was Sie wollen, und vieles davon wird von Ihrer Sicherheit abhängen, sowohl in finanzieller als auch in romantischer Hinsicht. Sie werden bei diesen Zielen nur dann langfristig erfolgreich sein, wenn Sie Ihrem Human Design Typ und Ihrer Strategie folgen, denn das ist einfach die Art, wie die Energie fliesst. Wenn Sie diese Richtlinien befolgen, dann wird die Romantik ein Schlüssel zu Ihrem Glück sein. Es ist Ihr zugrunde liegender Wunsch, glücklich und sicher zu sein, als Ihr persönliches Mittel zur Ermächtigung.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ungewissheit 2",
      tore: [14, 8, 59, 55],
      quelle: "Die Energie Ihres Kreuzes besteht darin, die Materialien und die Sicherheit bereitzustellen, um die Unsicherheit zu verringern. In der Beziehung sprechen wir von Zuhause, Unterkunft, Nahrung usw. In der Arbeit sprechen wir über Produkt, Ideen oder Richtung. Es gibt eine energetische Leere, die Sie füllen. Es gibt diese Menschen, sei es in der Familie, bei der Arbeit oder in der Gemeinschaft, die diese Ungewissheit haben, und Sie haben die Energie, Stabilität und materielle Güter bereitzustellen, um die Unsicherheit zu unterdrücken.",
    },
  },
  15: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Gefässes der Liebe 2",
      tore: [15, 10, 25, 46],
      quelle: "Als Gefäss der Liebe geboren, sind Sie hier, um Menschen auf liebevolle Weise in den Fluss zu bringen. Alle vier Tore Ihres Kreuzes sind mit dem G/Identitätszentrum und, auf einer tieferen Ebene, mit der Seele verbunden. Liebe des Geistes, Liebe des Fleisches, Liebe des Selbst und Liebe der Menschheit sind die vier Energien, aus denen dieses Kreuz besteht. Mit der Energie dieses Kreuzes geht die Menschheit für Sie voran. Es geht darum, die Menschen in den Fluss der Liebe zu sich selbst, zueinander und zur Menschheit zu bringen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Extreme",
      tore: [15, 10, 17, 18],
      quelle: "Bei der Energie dieses Kreuzes geht es darum, in den Extremen einen Rhythmus zu finden. Sie sind getrieben, in allen Aspekten Ihres Lebens einen Rhythmus zu finden, aber es kann ein extremer Rhythmus sein. Das kann so aussehen, dass Sie spät aufbleiben und dann früh aufstehen, dass Sie die Nachtschicht übernehmen oder dass Sie einen Monat lang jeden Tag trainieren und dann zwei Wochen lang nichts tun. Dies sind alles Beispiele für einen Rhythmus, aber mit einer extremen Wendung. Es ist in Ordnung, diese Extreme zu haben, denn das ist es, was Sie sind.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Prävention",
      tore: [15, 10, 17, 18],
      quelle: "Als Kreuz der Vorbeugung sprechen Sie von einem Ort der Liebe und der Vorsicht aus und leiten andere an, nicht Mustern oder Wegen zu folgen, bei denen sie verletzt werden könnten. Obwohl es Ihr Ziel ist, anderen liebevoll zu helfen, eine negative Erfahrung zu vermeiden, wird Ihre Führung nicht immer willkommen sein. Vergewissern Sie sich, dass Sie Ihrem Typ und Ihrer Strategie der menschlichen Gestaltung folgen, und in den meisten Fällen wird diese Energie vom Empfänger voll akzeptiert werden.",
    },
  },
  16: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Planung 2",
      tore: [16, 9, 37, 40],
      quelle: "Sie bringen die Energie des Enthusiasmus mit, einen besseren Weg zu finden, Dinge für das Kollektiv zu tun. Diese logische Energie wird verstärkt, wenn Sie sich mit dem, was Sie verbessern wollen, identifizieren oder leidenschaftlich dafür sind. Sie neigen dazu, diese Arbeit zu tun, indem Sie Ideen aufgreifen und tiefgehend analysieren, um das Leben besser zu machen. Ihre Schlüsselrolle ist es, den Geist, den \"Cheerleader\" und das Talent zusammenzubringen, während Sie nach der Tiefe der Lösung suchen. Ihre Herausforderung wird es sein, die Ressourcen zu finden, um das, was Sie brauchen, zu verwirklichen, denn die müssen Sie ausserhalb von sich selbst finden.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Experimentierens",
      tore: [16, 9, 63, 64],
      quelle: "Sie haben die Tendenz, sich sehr auf etwas zu fixieren, das Sie brennend interessiert. Wenn Sie sich wirklich mit etwas identifizieren, geht es Ihnen unter die Haut und Sie sind fest entschlossen, es zu verwirklichen. Es wird Ihnen schwerfallen, das loszulassen, was Sie scheinbar nicht manifestieren können. Sie sind hier, um entschlossen zu sein, und indem Sie Ihrem Human Design Typ und Ihrer Strategie folgen, lassen Sie das, womit Sie sich identifizieren, zum Leben erwachen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Identifikation",
      tore: [16, 9, 63, 64],
      quelle: "Sie tragen die Energie in sich, um Menschen dazu zu bringen, sich mit Ihrer Sache zu identifizieren. Ob Sie nun Geld für wohltätige Zwecke sammeln, Häuser verkaufen oder für ein Buch werben, Sie haben das Design, um Menschen dazu zu bringen, sich mit dem Bild zu identifizieren, das Sie malen. Im Kern ist es die Grundlage der Logik, kombiniert mit Charisma und Enthusiasmus, die die Menschen an Ihre Sache fesselt. Sie sind hier, um Menschen abzuholen, die sich mit dem identifizieren, woran Sie glauben.",
    },
  },
  17: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Dienstes",
      tore: [17, 18, 58, 52],
      quelle: "Ihr Kreuz bringt vier logische Energien zusammen. Die führende Energie ist die Meinungsenergie. Mit der Meinungsenergie gibt es einen grossen Drang, Dinge zu korrigieren und zu organisieren, damit Sie ein gesundes, längeres und freudigeres Leben führen können. Sie dienen den Menschen durch die logischen Energien der Führung, Organisation und Korrektur. Es gibt vielleicht einen Drang, sich als Heiler zu fühlen, aber es ist wichtig zu verstehen, dass Sie der Führer sind und jeder Mensch seine eigenen Schritte machen muss, um wirklich zu heilen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Meinungen",
      tore: [17, 18, 38, 39],
      quelle: "Sie sind hier, um Meinungen zu äussern. Nicht alle Ihre Meinungen werden beliebt sein und Sie werden nicht immer Recht haben. Aber Ihre Meinungen sind wichtig, um Verhalten zu korrigieren und logische Prozesse zu implementieren, die mehr Freude am Leben bringen. Da Sie von Natur aus rechthaberisch sind, ist es wichtig, dass Sie daran denken, dass Sie in einer Beziehung mit jemandem zusammen sein müssen, der sich damit wohlfühlt, wie frei Sie Ihre Meinung äussern.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Umwälzung",
      tore: [17, 18, 38, 39],
      quelle: "Mit Ihrem Kreuz ist es Ihre Aufgabe, sich die Hände schmutzig zu machen, herumzupfuschen und die Dinge aufzuwühlen. Sie bringen die Energie mit, um stagnierende Themen anzustossen und zu Bewertung, Korrektur und Verfeinerung anzuregen. Diese Energie kann einige Spannungen erzeugen, da nicht jeder möchte, dass seine Themen aufgewühlt werden.",
    },
  },
  18: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Dienstes 3",
      tore: [18, 17, 52, 58],
      quelle: "Sie bringen Energie, die sagt: \"Reiss dich zusammen\". Die leitende Energie hier ist die Korrektur und bei dieser Korrektur geht es darum, das Leben besser und freudiger zu machen. Es wird nicht immer einfach sein, diese Botschaft in die Welt zu bringen, denn nicht jeder ist bereit für eine Korrektur. Es mag sich persönlich anfühlen, aber erkennen Sie, dass es das nicht ist. Manchmal müssen Sie vielleicht die Übermittlung Ihrer Botschaft abmildern und sicherstellen, dass Ihre Korrektur von dem/den Empfänger(n) eingeladen wird, oder es wird ein grösserer Konflikt entstehen. Sie sind hier, um diese Welt zu formen, um sie zu einem besseren Ort zu machen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Korrektur",
      tore: [18, 17, 39, 38],
      quelle: "Sie sind hier, um Muster zu korrigieren und ein freudvolleres Leben zu entdecken. Sie sind hier, um dies für andere zu tun, müssen aber erkennen, dass Korrekturen oft nicht willkommen sind. Um erfolgreich zu sein und gesunde Beziehungen aufrechtzuerhalten, müssen Sie sich mit Ihrer Kommunikation an Ihren Human Design Typ und Ihre Strategie halten. Sie müssen Ihre Korrektur mit Takt und Sorgfalt verbalisieren. Wenn Sie das tun, können Sie wirklich weise sein, wenn es um Korrektur und Harmonie geht. Wenn Sie das nicht tun, werden Sie oft allein sein.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Umbruchs 2",
      tore: [18, 17, 39, 38],
      quelle: "Sie sind hier, um die Dinge aufzurütteln. Ihr Kreuz bringt die Energie, die Dinge umzukrempeln, um sie zu verbessern. Das ist eine praktische Energie, die versteht, dass es die Mühe nicht wert ist, wenn sich nichts ändert. Sie sind wie das sanftmütige Kind, das sich plötzlich erhebt, um es mit dem Tyrannen auf dem Spielplatz aufzunehmen und eine Veränderung zum Wohle aller herbeizuführen. Das ist es, was Sie hier tun sollen.",
    },
  },
  19: {
    rechts: {
      name: "Rechtswinkliges Kreuz der vier Wege 4",
      tore: [19, 33, 44, 24],
      quelle: "Ihr Kreuz wird von der Energie angetrieben, dafür zu sorgen, dass jeder hat, was er braucht. Das grundlegendste Bedürfnis ist Nahrung. Für Sie mag das nur der Antrieb sein, dafür zu sorgen, dass Ihre Familie ernährt wird, aber für die meisten mit diesem Kreuz geht es um mehr als das und kann sich auf die Gemeinschaft, das Land oder die Welt erstrecken. Darüber hinaus hat Ihr Kreuz eine tiefe spirituelle Verbindung, die mit dem Antrieb, sich zu ernähren, verflochten ist.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Not",
      tore: [19, 33, 1, 2],
      quelle: "Ihr Kreuz hat das Bedürfnis, ausdrucksstark zu sein. Diese Energie ist sehr kreativ, aber es gibt ein starkes Verlangen danach, diese Kreativität im Privaten auszuleben. Sie haben das Bedürfnis, Ihren eigenen Raum zu haben, in dem Sie Ihre kreativen Säfte fliessen lassen können. Sie sind hier, um auf Ihre eigene Weise und in Ihrem eigenen Raum kreativ zu sein.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Verfeinerung 2",
      tore: [19, 33, 1, 2],
      quelle: "Die Energie Ihres Kreuzes gibt die Richtung vor, was gebraucht wird. Dabei geht es nicht um das, was heute gebraucht wird, sondern eher um das, was weiter in der Zukunft liegt. Derzeit ist dies die Stimme der Bio-Bewegung. Sicher, durch den Einsatz von kommerziellem Dünger und Pestiziden produzieren wir eine Menge Nahrung, aber der Boden wird sich abnutzen und das Ökosystem ist unausgeglichen und auf lange Sicht werden wir grosse Probleme haben. Nachhaltige Landwirtschaft ist die Lösung auf lange Sicht. Sie sind hier, um die Stimme zu sein, die uns in die längerfristige Richtung weist, besonders in Bezug auf Nahrung und Dinge, die wir zum Überleben brauchen.",
    },
  },
  20: {
    rechts: {
      name: "Rechtswinkliges Kreuz des schlafenden Phönix 2",
      tore: [20, 34, 55, 59],
      quelle: "Bei der Energie, die Sie tragen, geht es darum, beschäftigt zu sein. Es spielt keine Rolle, was Sie tun, Sie wissen nur, dass beschäftigt zu sein das ist, was Sie brauchen. In dieser Energie steckt ein starkes Mass an Individualismus, und daraus können Sie Stärke oder Einsamkeit, Freude oder Melancholie ableiten. Sie können beschäftigt sein und glücklich sein oder mit Ihrer Traurigkeit beschäftigt sein. Das Glück zu finden, liegt an Ihnen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Jetzt",
      tore: [20, 34, 37, 40],
      quelle: "Dieses Kreuz trägt die Energie des Seins im gegenwärtigen Moment. Es trägt auch die Energie von Familie und Gemeinschaft. Die Herausforderung für Sie ist, dass Sie sich so sehr im Jetzt verlieren können, dass Sie Ihre Freunde, Familie und Gemeinschaft aus den Augen verlieren. Wenn Sie die Balance finden, um Ihr Sein im Jetzt und Ihre Verbundenheit mit Ihrer Gemeinschaft aufrechtzuerhalten, können Sie letztlich ein Vorbild für das Gegenwärtigsein sein.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Dualität",
      tore: [20, 34, 37, 40],
      quelle: "Sie sind hier, um die mutative Kraft im Stamm zu sein. Sie tragen eine sehr fleissige Energie in sich, um Dinge zu tun und sie zu erledigen. Die individuellen Aspekte, die Sie einbringen, können für Ihre Gemeinschaft attraktiv sein, um sie in ihre Praxis zu adaptieren. Allerdings sind nicht alle individuellen Veränderungen aus zwei Gründen adaptiv. Erstens, Sie möchten es vielleicht für sich behalten und nicht teilen. Zweitens, die Gruppe oder Gemeinschaft sieht vielleicht nicht den Wert in Ihren neuen Wegen und lehnt sie ab. Es ist also ein Tanz, den Sie in diesem Leben vollführen werden, indem Sie der Gruppe oder der Gemeinschaft Veränderungen bringen und sehen, ob sie angenommen werden oder nicht.",
    },
  },
  21: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Spannung",
      tore: [21, 48, 38, 39],
      quelle: "Ihr Kreuz trägt die Energie der Spannung, die notwendig ist, um die Ordnung in einer Stammesumgebung aufrechtzuerhalten. Dies kann sich in der Familie, bei der Arbeit oder in der Gemeinschaft abspielen, aber die Spannung ist eine notwendige Provokation, um die Gruppe auszurichten und in Ordnung zu halten. Die Spannung trägt auch dazu bei, eine Reaktion zu provozieren, die Gelegenheit für eine effektivere Führung bietet.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Kontrolle",
      tore: [21, 48, 54, 53],
      quelle: "Ihr Kreuz hat die Energie des Kontrollbedürfnisses. Durch diese Kontrolle können Sie etwas nehmen und es als etwas Neues erschaffen. Jeder hat diese Fähigkeit, aber nicht mit der Stärke, die Sie haben. Mit dieser Energie können Sie die Kontrolle über eine Situation übernehmen, neu beginnen und sie zu dem machen, was sie wirklich sein soll. Durch Ihren Drang, die Kontrolle zu übernehmen, bewirken Sie Innovation, und deshalb sind Sie wirklich hier.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Bestrebens",
      tore: [21, 48, 54, 53],
      quelle: "Bei der Energie in Ihrem Kreuz geht es darum, auf eine sehr kontrollierte Weise zusammenzukommen, um etwas Grösseres zu erreichen. Sie sind bestrebt, durch das Zusammenführen kleinerer Kräfte etwas Grosses und Komplexes zu bewirken. Strenge Kontrolle ist ein Muss, denn sonst herrscht Chaos, und das ist nicht das, worum es Ihnen oder dieser Energie geht.",
    },
  },
  22: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Herrschers",
      tore: [22, 47, 26, 45],
      quelle: "Angetrieben von den Energien des Zuhörens, Erziehens und Herausfindens haben Sie die Energie, Ihre Welt zu beherrschen. Ob sie sich als Ihre eigene individuelle Welt, Ihre Familie, Ihre Stadt oder Ihr Land manifestiert, Sie haben die Fähigkeit, mit Anmut zu herrschen. Diese Herrschaft kommt zu Ihnen - Sie brauchen sie nicht zu suchen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Gnade",
      tore: [22, 47, 11, 12],
      quelle: "Sie haben die Anlage, ein Zuhörer zu sein, und Sie lieben es, zuzuhören. Sie verlieben sich in das Zuhören bestimmter Dinge in Ihrem Leben, nur um länger zuhören zu können. Aus diesem Grund haben Sie die Gabe, mit Fremden zu arbeiten, da sie instinktiv wissen, dass Sie aufmerksam zuhören, was sie zu sagen haben.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Informierens",
      tore: [22, 47, 11, 12],
      quelle: "Sie haben die grosse Gabe, die Energie zum Zuhören und die Energie zum Kommunizieren zu besitzen. Sie tragen die Energie in sich, anderen aufmerksam zuzuhören, wenn sie sprechen, und sind dann in der Lage, das Gesagte eloquent zu vermitteln. Sie sind der Sammler und Verteiler von Informationen. Jede Familie, Gemeinschaft, Regierung braucht jemanden wie Sie.",
    },
  },
  23: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Erläuterung 2",
      tore: [23, 43, 49, 4],
      quelle: "Sie sind hier, um einen individuellen Ausdruck zu vokalisieren. Da es sich um einen individuellen Ausdruck handelt, ist er für das Kollektiv neu, und Ihre Zuhörer mögen so tun, als sei das, was Sie sagen, seltsam oder bizarr. Sie haben daher die eingebaute Energie, das, was Sie gesagt oder getan haben, immer wieder zu wiederholen. Durch diesen Prozess der Wiederholung wird der Rest der Menschheit (oder zumindest Freunde und Familie) allmählich mit dem vertraut, was Sie zum Ausdruck bringen. Eine Veranschaulichung dieser Energie sind populäre Modeerscheinungen. Jemand mit individueller Energie tut etwas Neues - er trägt einen neuen Schuhtyp oder hat eine neue Frisur. Zuerst ist die Reaktion der Gesellschaft: \"Das ist einfach nur seltsam. Aber nachdem man es 5, 10, 20 Mal gesehen hat, fangen andere Leute an, es zu tun und es setzt sich durch. Sie sind hier, um uns mit den neuen Ideen bekannt zu machen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Assimilation",
      tore: [23, 43, 30, 29],
      quelle: "Sie haben die Energie, die Sie dazu antreibt, individuelle Ideen vorzubringen, um Veränderungen zu schaffen. Individuelle Ideen können auf andere zunächst bizarr oder fremd wirken, weil sie neu und anders sind. Die Herausforderung Ihres Kreuzes besteht darin, diese vorzubringen, ohne andere abzuschrecken. Sie werden einen Tanz vollführen, bei dem Sie diesen Ausdruck zurückhalten, bis Sie die Menschen kennengelernt haben, und erst dann Ihren wahren Ausdruck herauslassen. Dieses innere Du zum Ausdruck zu bringen, ist Ihr Beitrag. Aus diesen individuellen Ideen wird Neues geboren und kann angenommen werden. Denken Sie nur daran, dass nicht alle neuen Ideen sich durchsetzen. Manche schon, andere bleiben auf der Strecke.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Hingabe",
      tore: [23, 43, 30, 29],
      quelle: "In Ihrem Kreuz steckt der Drang, immer wieder die gleiche Erklärung zu geben. Dieses Kreuz ist eine hervorragende Grundlage für das Lehren. Durch das Lehren können Sie den brennenden Wunsch erfüllen, das Gleiche immer und immer wieder zu wiederholen und vielleicht im Laufe der Zeit Ihre Botschaft durch das Nacherzählen zu verdeutlichen. Die Hingabe, die Sie zur Erklärung haben, ist das Geschenk, das Sie in dieses Leben mitbringen.",
    },
  },
  24: {
    rechts: {
      name: "Rechtswinkliges Kreuz der vier Wege",
      tore: [24, 44, 19, 33],
      quelle: "Sie sind getrieben, alles, was Ihnen im Leben begegnet, zu wissen und geistig zu verstehen. Diese führende Kraft wird Sie dazu bringen, die Dinge immer wieder durchzugehen, bis Sie ein solides Verständnis haben. Diese Kraft gibt Ihnen ein Ziel, wie die Wellen des Ozeans, die den Stein am Strand polieren, werden Sie zu den Dingen zurückkehren, zu Erfahrungen, zu Erinnerungen, um immer wieder nach dem tieferen Verständnis zu suchen, wie alles funktioniert und zusammenpasst. Dies ist ein individueller Antrieb, daher werden Sie Ihre Gabe eher als Beispiel oder individuellen Beitrag nutzen, da die meisten anderen nicht die Geduld haben, Dinge so oft durchzugehen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Rationalisierung",
      tore: [24, 44, 13, 7],
      quelle: "Sie tragen die Energie in sich, die es Ihnen ermöglicht, unglaublich begabt zu sein, Konzepte zu erfassen und wirklich zu verstehen. Diese Energie kann Sie zu einem der klügsten Menschen auf diesem Planeten machen. Die Herausforderung für Sie besteht darin, Ihr Verständnis in das des Kollektivs zu übersetzen. Das Konzept muss nicht nur im Moment erklärt werden, sondern es muss auch rationalisiert werden, wie es mit der Vergangenheit und der Zukunft zusammenhängt.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Inkarnation",
      tore: [24, 44, 13, 7],
      quelle: "Sie tragen die Energie des Prozesses der Inkarnation in sich. Auf einer gewissen Ebene haben Sie ein tiefes Verständnis dafür, dass wir immer kommen und gehen. Die Zellen in unserem Körper haben eine begrenzte Lebensspanne. Wenn Zellen absterben, werden sie durch neue ersetzt. Ihre Energie hat eine Anerkennung für dieses Muster. Sie sind hier, um all dem, was Ihnen begegnet, eine Richtung zu geben. In welchem Prozess sich auch immer etwas in seinem Leben befindet, Sie haben gesehen, was dazu führt und wohin es geht. Ohne es auf einer bewussten Ebene zu wissen, geben Sie eine Anleitung, wohin ihr Prozess sie führen wird.",
    },
  },
  25: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Gefässes der Liebe",
      tore: [25, 46, 10, 15],
      quelle: "Im Zentrum all Ihrer Energien steht die Liebe. Sie haben die Liebe zum Körper, die Liebe zur Menschheit, die Liebe zum Verhalten und die universelle Liebe. Sie sind hier, um universell liebevoll zu allen Dingen zu sein. Es kann sein, dass Sie an irgendeinem Punkt in Ihrem Leben auf einen Schock stossen, und Ihre Herausforderung besteht darin, diesen zu überwinden.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Unschuld",
      tore: [25, 46, 58, 52],
      quelle: "Sie sind hier, um einen Einfluss auf die Welt auszuüben, um die Liebe zum Leben und zum Wohnen voranzubringen. Dabei geht es nicht unbedingt darum, Glück zu finden, obwohl das die ideale Situation ist. Es geht darum, diese überschäumende Freude zu finden, im Körper zu sein und durch diese menschliche Existenz zu gehen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Heilung",
      tore: [25, 46, 58, 52],
      quelle: "Die Energie Ihres Kreuzes soll den Wert der Gesundheit und ihre Notwendigkeit für ein freudvolles Leben vermitteln. Alle anderen Dinge - Essen, Geld, Liebe - verblassen im Vergleich, wenn Sie nicht Ihre Gesundheit und die Fähigkeit, sie zu geniessen, haben. Als Kreuz des Heilers besteht die Tendenz, selbst durch Perioden der Krankheit zu gehen, damit Sie der Welt die Freude und den Nutzen des Heilens und Gesund-Seins predigen können.",
    },
  },
  26: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Herrschers 4",
      tore: [26, 45, 47, 22],
      quelle: "Sie haben die Energie, sich als Führungspersönlichkeit zu vermarkten. Ihre Fähigkeiten, Ihr Image zu spinnen, werden Ihre Fähigkeit zu führen verkaufen. Dies ist kein faktenbasiertes Unternehmen. Ihre Fähigkeit, zu führen, basiert auf der Marketing-Energie, die Sie besitzen. Sie sind hier, um eine Führungskraft zu sein und sich selbst als Führungskraft zu verkaufen. Stellen Sie nur sicher, dass Sie das Zeug dazu haben, es zu tun.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Tricksters",
      tore: [26, 45, 6, 36],
      quelle: "Ihr Kreuz hat die Energie der \"Leichtfertigkeit\". Sie haben die Fähigkeit, zu verkaufen und die Leute an das zu glauben, was Sie verkaufen. Ob Sie nun Autos oder eine neue Idee verkaufen, Sie haben die Marketing-Fähigkeit und die Vertrauenswürdigkeit, um das Engagement zu bekommen. Die Energie Ihres Kreuzes ist sehr wichtig, denn während sie auf betrügerische Weise eingesetzt werden kann, kann sie auch helfen, Menschen um wichtige Ideen zu scharen, für die es noch nicht genügend empirische Beweise zur Unterstützung gibt.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Konfrontation 2",
      tore: [26, 45, 6, 36],
      quelle: "Sie haben die Energie, Herrschaft zu konfrontieren und Ihre eigene Herrschaft durchzusetzen. Ihre Energie ist darauf ausgelegt, eine harte Kante zu haben, denn Sie sind hier, um es mit Menschen an der Macht aufzunehmen, die in Frage gestellt werden sollten. Ausserdem ist Ihre Energie so angelegt, dass sie provokativ ist, denn aus der Provokation folgt die Rechtfertigung. Mit der Rechtfertigung kommen Informationen, um ein tieferes Verständnis dafür zu bekommen, worum es den Leuten geht und wofür sie stehen. Ihr energetisches Auftreten ist konfrontativ und hat den Zweck, uns zu helfen, den Dingen auf den Grund zu gehen.",
    },
  },
  27: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Unerwarteten",
      tore: [27, 28, 41, 31],
      quelle: "Als Stammeskreuzer bist du hier, um deinen Stamm zu unterstützen und für ihn einzustehen, ob das nun Freunde, Familie, deine Stadt, deine Schule, dein Team oder dein Land ist. Du bist hier, um sicherzustellen, dass dein Stamm gehegt und gepflegt wird, auch wenn es das Beugen des Gesetzes erfordert. Sie werden auch feststellen, dass Sie unerwartete Dinge zustande bringen. Ob das nun Ihr Werk ist oder nur der Zufall der Energie um Sie herum, das Unerwartete ist etwas, das Sie in Ihrem Leben erwarten können, sowohl zum Guten als auch zum weniger Guten.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Fürsorge",
      tore: [27, 28, 19, 33],
      quelle: "Sie sind hier, um ein Gefühl der Fürsorge für alle Dinge und alle Menschen mitzubringen. Dies kann ein Segen oder manchmal auch eine Last sein. Fürsorge gibt Ihnen ein Ziel, und ein Teil dieses Antriebs ist es, sicherzustellen, dass auch für Sie gesorgt wird. Dies ist die Energie, die von \"Liebe deinen Nächsten\" spricht, und es ist Ihr Prozess, dafür einen Sinn in Ihrem Leben zu finden.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ausrichtung",
      tore: [27, 28, 19, 33],
      quelle: "Sie tragen die Energie in sich, mit Unerwartetem auf erstaunlich sanfte Weise umzugehen. Aufgrund der Geometrie, wie Energie funktioniert, ziehen Sie unerwartete Dinge in Ihr Leben. Ihr Ziel ist es, sich um diese herum oder durch diese hindurch zu bewegen, für sich selbst und für andere. Sie wären gut an der Front, sei es beim Militär, bei der Feuerwehr, als Rettungssanitäter oder Lehrer oder in jeder anderen Karriere, in der es wichtig ist, das Unerwartete auszubalancieren und sich reibungslos hindurch zu bewegen.",
    },
  },
  28: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Unerwarteten 3",
      tore: [28, 27, 31, 41],
      quelle: "Sie haben die Energie, in diesem Leben mit Dingen zu kämpfen. Wenn Sie Ihre Leidenschaft finden, dann wird sich Ihr Kampf lohnend und produktiv anfühlen. Wenn Sie Ihre Leidenschaft nicht finden können, dann wird sich Ihr Kampf deprimierend anfühlen. Finden Sie Ihre Leidenschaft und umarmen Sie Ihren Kampf, denn er ist dazu bestimmt, einen tieferen und persönlicheren Sinn des Lebens herbeizuführen. Mit diesem Kreuz haben Sie das Schicksal, dass unerwartete Dinge in Ihrem Leben auftauchen. Geniessen Sie die Fahrt, sie hat einen Sinn.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Risiken",
      tore: [28, 27, 33, 19],
      quelle: "Die Energie Ihres Kreuzes ist die eines Glücksspielers. Sie sind bereit und getrieben, Risiken einzugehen, um den Nervenkitzel zu erleben. Durch Ihre Risiken suchen Sie sowohl den Zweck als auch den Rausch. Folgen Sie Ihrem Human Design Typ und Ihrer Strategie und achten Sie darauf, dass die Dinge, auf die Sie viel setzen, das sind, wofür Sie eine Leidenschaft haben. Mit dieser Strategie ist Ihr Erfolg garantiert!",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ausrichtung 2",
      tore: [28, 27, 33, 19],
      quelle: "Sie sind hier mit der Energie, einen Wechsel von dem alten, traditionellen Paradigma zu vollziehen und sich auf das neue auszurichten. Sie sind hier, um den Weg zu zeigen und in der Lage zu sein, genau das zu tun. Es mag ein gewisses Risiko bei der Umstellung geben, aber wenn Sie Ihrem Human Design Typ und Ihrer Strategie folgen, dann werden die Risiken, die Sie eingehen, gerechtfertigt sein. Es besteht eine gewisse Gefahr, diese Änderung vorzunehmen, weil Sie als Deserteur angesehen werden können. Sie sind jedoch hier, um sich auf das Neue auszurichten, und Sie verstehen, dass nichts ewig währt.",
    },
  },
  29: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Ansteckung 3",
      tore: [29, 30, 8, 14],
      quelle: "Ihr Kreuz trägt die Energie, \"Ja\" zu sagen. Es trägt auch einen Enthusiasmus für das Leben und ist angetrieben, Dinge grossartig zu machen, indem es im Takt marschiert. Sie sind hier, um Begeisterung zu verbreiten und das Wort über das zu verbreiten, was auch immer es ist, wofür Sie leidenschaftlich sind. Ihr Engagement für die Dinge ist grenzenlos und schürt die Begeisterung. Allerdings sind Sie hier auf der Erde in einem physischen Körper und haben einige Beschränkungen. Sie müssen der Anzahl der Dinge, zu denen Sie \"Ja\" sagen, Grenzen setzen. Vergewissern Sie sich, dass Sie nur dem zustimmen, wofür Sie absolut leidenschaftlich sind. Wenn Sie das nicht tun, werden Sie mit Sicherheit ausbrennen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Verpflichtung",
      tore: [29, 30, 20, 34],
      quelle: "Sie sind hier, um \"Ja\" zu sagen und sich zu vielen Dingen zu verpflichten. Sie haben den brennenden Wunsch, allem zuzustimmen, und leider wird Sie das wahrscheinlich ausbrennen. Sie haben die Fähigkeit, sich mit extremer Hingabe einer Sache zu widmen, und Ihr Engagement kann die Menschen um Sie herum inspirieren. Stellen Sie sicher, dass Sie sich für etwas engagieren, das wirklich Ihre Leidenschaft ist, und folgen Sie Ihrem Human Design Typ und Ihrer Strategie.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Emsigkeit 2",
      tore: [29, 30, 20, 34],
      quelle: "Sie sind hier, um Dinge zu tun und können ständig beschäftigt sein. Sie können sehr engagiert sein bei dem, was Sie tun. Es ist äusserst wichtig, dass Sie Ihrem Human Design Typ und Ihrer Strategie folgen. Genauso wichtig ist es aber auch, dass Sie sicherstellen, dass das, was Sie beschäftigt, etwas ist, für das Sie eine Leidenschaft haben. Diese Leidenschaft ist nicht nur ein vages Interesse, sondern eine Leidenschaft, die aus dem Kern Ihrer Seele fliesst. Wenn Sie Ihre Leidenschaft finden und sie in Bewegung setzen können, werden Sie zu den fleissigsten und produktivsten Menschen auf diesem Planeten gehören.",
    },
  },
  30: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Ansteckung",
      tore: [30, 29, 14, 8],
      quelle: "Ihr Kreuz trägt die Energie des Verlangens und des Erlebens dessen, was Sie sich wünschen. Sie sind derjenige, der neue Dinge ausprobiert. Es ist Ihr Impuls. Der Rest von uns profitiert von den Ergebnissen Ihrer Erfahrung, im Guten wie im Schlechten. Sie tragen auch die Energie in sich, die \"Ja\" sagen will. Sie müssen diese Tendenz vielleicht in den Griff bekommen, sonst werden Sie von all Ihren Verpflichtungen überwältigt.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Schicksale",
      tore: [30, 29, 34, 20],
      quelle: "Sie tragen die Energie von Antrieb und Besessenheit in sich. Sie werden von einer Leidenschaft angetrieben, die tief in Ihnen mitschwingt und Sie vorwärts treibt. Sie werden endlos und kontinuierlich an Ihrer Leidenschaft arbeiten, bis Sie ausbrennen. Ausbrennen liegt in der Natur des Rhythmus, den Sie in dieses Leben bringen. Es gab viele grosse Entdeckungen, die von Menschen mit diesem Kreuz gemacht wurden.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Emsigkeit",
      tore: [30, 29, 34, 20],
      quelle: "Die Energie dieses Kreuzes besteht darin, fleissig zu sein. Es besteht ein starker Wunsch, beschäftigt zu sein und zu sehen, dass andere beschäftigt sind. Der Antrieb für dieses Geschäft ist das Ziel, Menschen zusammenzubringen. Sie glauben, dass wir bei dieser Arbeit alle zusammenkommen werden. Der Trick für Sie besteht darin, sicherzustellen, dass Sie Ihrer Strategie folgen und Ihr Geschäft als Reaktion nutzen, anstatt zu versuchen, sich direkt zu manifestieren.",
    },
  },
  31: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Unerwarteten 2",
      tore: [31, 41, 27, 28],
      quelle: "Sie tragen die Energie in sich, die Sie wahrscheinlich eher unerwartet in eine Führungsposition bringen wird. Es wird scheinen, als käme es aus dem Nichts - plötzlich stehen Sie im Rampenlicht, oder zumindest halten Sie die Dinge in Gang. Seien Sie sich bewusst, dass Sie diese Energie haben und irgendwann in eine Führungsrolle gedrängt werden. Machen Sie sich bereit, die Verantwortung zu übernehmen, denn dafür sind Sie ja hier.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Einflusses",
      tore: [31, 41, 24, 44],
      quelle: "Sie haben die Energie, bei anderen sehr einflussreich zu sein, weil Sie eine Energie der Beharrlichkeit haben. Das ist das Design eines Agenten, Beraters oder Architekten, denn Sie werden die Prozesse immer wieder durchgehen, bis Sie Ihre Ziele erreichen. Ihre Fähigkeit, Einfluss zu nehmen, verbindet Ihre zwischenmenschlichen Fähigkeiten mit einer Führungsqualität. Sie werden den Wunsch haben, andere zu führen und zu beeinflussen, damit sie Ihrem Weg folgen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Alpha",
      tore: [31, 41, 24, 44],
      quelle: "Dies ist das Kreuz eines Anführers. Sie haben die Alpha-Energie, um der Anführer des Rudels zu sein und dafür zu sorgen, dass die Überlebensbedürfnisse des Rudels befriedigt werden. Sie haben die geistige Beweglichkeit, um zu planen, und die Präsenz, die allen versichert, dass sie in Sicherheit sind. Sicherheit ist ein wichtiger Akt Ihrer Führung, da die Gruppe, die Sie führen, die Angst, die auf dem Überleben basiert, lindern möchte. Ihre Energie eignet sich natürlich dafür, egal ob Sie als General oder Patriarch führen, aber stellen Sie sicher, dass Sie die Führung in Übereinstimmung mit Ihrem Human Design Typ und Ihrer Strategie übernehmen. Dies wird die Stärke Ihres Führungsstils sicherstellen.",
    },
  },
  32: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Maya 3",
      tore: [32, 42, 62, 61],
      quelle: "Dieses Kreuz hat die Energie des Überlebens durch die Suche nach Werten. Es kann eine starke Belastung des Überlebens, des Sparens und Aufbewahrens von Dingen enthalten. Es ist eine Energie, die nach dem Wert in anderen und in Materialien sucht. Sie sind hier, um diese Werte auf eine Weise zusammenzubringen, die das Überleben des Selbst und der Spezies sichert.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Bewahrung",
      tore: [32, 42, 56, 60],
      quelle: "Die Energie Ihres Kreuzes besteht darin, das Leben zu erhalten und zu bewahren. Dies kann sich auf vielerlei Art und Weise manifestieren, auch in Form von Ängsten. Sie werden vielleicht dazu getrieben, sich auf eine Katastrophe vorzubereiten, indem Sie Vorräte an Nahrung und Wasser anlegen. Vielleicht sind Sie leidenschaftlich an der Umwelt interessiert und fühlen sich dazu berufen, Naturschutzorganisationen oder -bewegungen zu dienen oder sich an ihnen zu beteiligen. Sie sind hier, um Ihre Stimme anzubieten, um das Leben zu erhalten, seien Sie nur sicher, dass Sie sich nicht zu sehr in der Angst verfangen. Die Angst ist zwar eine wichtige Triebfeder für den Naturschutz, sie kann aber übermächtig werden und vom Guten der Sache ablenken. Bleiben Sie in Ihrem Kernziel geerdet.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Begrenzung 2",
      tore: [32, 42, 56, 60],
      quelle: "Ihr Kreuz hat die Energie, Begrenzungen zu kennen, um zu überleben oder Erhaltung zu erreichen. Dies basiert auf einer Energie, die ängstlich ist, und manchmal kann sie in Begriffen sprechen, dass es keinen Sinn hat, es zu versuchen. Ihre Gabe ist, dass Sie die Begrenzungen, die notwendig sind, um erfolgreich zu sein, erkennen und darüber kommunizieren können. Ihre Schuld ist, dass bei der Dualität die ängstliche Seite stark sein und die Oberhand gewinnen kann und zu Depressionen bei Ihnen oder anderen führen kann. Bemühen Sie sich um eine positive Denkweise!",
    },
  },
  33: {
    rechts: {
      name: "Rechtswinkliges Kreuz der vier Wege 2",
      tore: [33, 19, 24, 44],
      quelle: "Ihr Kreuz wird von der Führungsenergie angetrieben, die nach Privatsphäre sucht. Dies ist eine Rückzugsenergie, die eigentlich nach Freiheit sucht, die nur im eigenen Raum zu finden ist. Dieses Kreuz ist in vielerlei Hinsicht mit dem Wohnen verbunden, denn Ihre eigenen vier Wände zu haben, wo Sie hingehen und einfach Sie selbst sein können, ist wichtig für Sie. Sie mögen zwar sehr sozial sein, aber es kommt eine Zeit, in der Sie allein sein müssen. Diese Energie kann sich in vielen Formen manifestieren, aber oft geht es um das Recht für jeden, seinen eigenen Raum zu haben, um er selbst zu sein.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Rückzugs",
      tore: [33, 19, 2, 1],
      quelle: "In Ihrer Energie geht es um das Recht für jeden, seinen eigenen kleinen Rückzugsort zu haben. Dies ist der Beginn des Friedensprozesses. Um Frieden zu haben, muss jeder sein eigenes kleines Territorium haben, seine eigenen vier Wände, in die er sich zurückzieht und seinen eigenen Raum hat. Sie sind hier, um diesen Einfluss einzubringen und Ihre Leidenschaft zu manifestieren. Das zeigt sich allein schon durch das Beispiel, das Sie geben, indem Sie Sie selbst sind, ob Sie nun Designer, Stadtplaner, Architekt oder Freiwilliger bei Habitat for Humanity sind. Jeder dieser Wege und mehr könnte die Art und Weise sein, wie Sie Ihr Kreuz des Rückzugs ausleben.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Zurückgezogenheit",
      tore: [33, 19, 2, 1],
      quelle: "Sie bringen die Energie, einen eigenen Lebensraum und schöne Dinge darin zu haben. Ein Teil der treibenden Kraft dreht sich um Privatsphäre und einen eigenen Raum, nicht nur für Sie, sondern aus der Überzeugung heraus, dass es das Recht eines jeden ist, so etwas zu haben. Zusätzlich zu dem Schutz, den ein Haus bietet, wünschen Sie sich etwas Schönheit darin, um Ihr Leben zu bereichern. Sie sind hier, um sicherzustellen, dass jeder von uns das Recht auf seinen eigenen privaten und inspirierenden Raum hat.",
    },
  },
  34: {
    rechts: {
      name: "Rechtswinkliges Kreuz des schlafenden Phönix 4",
      tore: [34, 20, 59, 55],
      quelle: "Ihre Energie hat ein grosses Bedürfnis, beschäftigt zu sein. Der Kanal 34-20 ist eine Hauptenergielinie vom Sakralzentrum zum Kehlkopfzentrum und es geht darum, \"es zu tun\", was immer \"es\" auch ist. Hüten Sie sich davor, sich in Ihren Geschäften zu verlieren und von dem abgelenkt zu werden, was für Ihre Seele wichtig ist. Stellen Sie sicher, dass Sie Dinge tun, die Ihre Leidenschaft sind und Ihr Herz zum Singen bringen. Folgen Sie Ihrem Human Design Typ und Ihrer Strategie, um fokussiert und geerdet zu bleiben. Sie sind hier, um sehr produktiv zu sein und sich zu sicheren Beziehungen hingezogen zu fühlen. Letztendlich erreichen Sie dieses Ziel, indem Sie auf Ihre Seele hören - nicht indem Sie einfach nur Dinge tun.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Macht",
      tore: [34, 20, 40, 37],
      quelle: "Ihr Kreuz bringt eine Menge Kraft und Energie mit sich. Sie sind hier, um diese Energie gegen eine Gegenleistung einzutauschen. Das kann in Form von Unterhaltung sein oder indem Sie auf andere Weise produktiv sind. Sie haben die Macht, Dinge zu tun, nach denen andere streben. Sie sind hier, um die Macht zu teilen und zu bekommen, was Sie wollen. Vergewissern Sie sich, dass das, was Sie anstreben, das ist, was Sie auf der Seelenebene wollen und nicht zu sehr von Ihrem Ego beeinflusst wird.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Dualität 2",
      tore: [34, 20, 40, 37],
      quelle: "Ihr Kreuz hat die Energie, sowohl individuell als auch als Teil einer Gemeinschaft zu gedeihen. Ihre Herausforderung besteht darin, das Gleichgewicht zwischen diesen beiden verschiedenen Arten von Energie zu finden. Vielleicht haben Sie oft das Gefühl, allein zu sein, ohne die Kontrolle und Einschränkung, die eine Gruppe um Sie herum aufbaut. Doch in Gruppensituationen blühen Sie auf. Sie sind hier, um Ihren Beitrag zur Familie, Gruppe oder Gemeinschaft zu leisten, auch wenn Sie nicht immer glücklich sind, in dieser Situation zu sein. Vielleicht finden Sie Ihr Gleichgewicht als externer Mitarbeiter oder Freiberufler.",
    },
  },
  35: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Bewusstseins 2",
      tore: [35, 5, 63, 64],
      quelle: "Sie sind hier, um die Energien des Wunsches auszugleichen, eine Erfahrung zu machen und damit fertig zu werden. Ihr Motto lautet: \"Das habe ich schon erlebt, das habe ich schon hinter mir\". Wenn Situationen im Leben auftauchen, werden Sie oft feststellen, dass Sie etwas Ähnliches schon einmal erlebt haben, so dass Sie sich nicht die Mühe machen müssen, das alles noch einmal zu machen. Sie fühlen vielleicht einen enormen Druck, alle Aspekte einer Situation zu erfahren, damit Sie diese Erfahrung vollständig kennen. Ihre Aufgabe ist es, das Kollektiv davor zu bewahren, das zu wiederholen, was wir wissen, und uns dabei zu helfen, das zu erfahren, was wir noch nicht gemeistert haben.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Erfahrungen",
      tore: [35, 5, 22, 47],
      quelle: "Sie sind getrieben, sehr spezifische und einzigartige Erfahrungen zu machen. Es gibt dieses innere Verlangen, sich auf eine bestimmte Erfahrung zu konzentrieren und dann darauf hinzuarbeiten, bis sie vollendet ist. Es wird eine enorme Erwartung an das Ergebnis gestellt, und Sie sind vielleicht enttäuscht, weil die Erfahrung einem solchen Aufbau nicht gerecht werden konnte. Es ist wichtig, dass Sie Ihrem Human Design Typ und Ihrer Strategie folgen, damit Sie den Erfahrungen folgen, die für Sie richtig sind.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Trennung",
      tore: [35, 5, 22, 47],
      quelle: "Die Energie Ihres Kreuzes besteht darin, das Leben mit Akzeptanz aller Arten zu leben. Es gibt ein Erbe in uns als Menschen, dass wir von Natur aus stammesbezogen sind und Fremde aus unserem Stamm als verdächtig behandeln. Aber Ihr Kreuz hat sich darüber hinaus entwickelt, da unsere Städte grösser geworden sind, gibt es ein Bedürfnis, nicht jeden zu kennen oder gar zu erkennen. Ihre Energie ist es, Fremde um sich herum zu akzeptieren und sich wohl zu fühlen. Dies ist wahrscheinlich eine Schlüsselbegabung, die Sie in Ihrer Karriere nutzen können.",
    },
  },
  36: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Eden",
      tore: [36, 6, 11, 12],
      quelle: "Bei der Energie, die Sie tragen, geht es darum, aus Eden hinausgeworfen zu werden und es dann wieder zu entdecken. Viele Menschen auf diesem Kreuz kommen ins Leben und haben entweder das Gefühl, aus dem Paradies (dem Himmel) hinausgeworfen worden zu sein, oder sie machen schon früh im Leben eine Erfahrung, die ihnen das Gefühl gibt, Eden verloren zu haben. Ihre Energie gibt Ihnen den Antrieb, Ihr eigenes Eden durch Erfahrung zu suchen. Die Erfahrung ist in Wirklichkeit Ihr Antrieb, vorwärts zu gehen. Ihre Gabe ist es, dieses Stückchen Eden zu finden und es der Welt zu zeigen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Krise",
      tore: [36, 6, 10, 15],
      quelle: "Ihr Kreuz bringt die Energie der Liebe zur Menschlichkeit und den Wunsch nach Intimität zusammen. Das kann zu inneren Konflikten führen, da Sie sich bemühen, das Verhalten des Selbst, das in der Liebe zur Menschlichkeit wurzelt, und den Wunsch, dem Drang nach Intimität nachzukommen, miteinander in Einklang zu bringen. Ihr Ziel ist es, diese in Harmonie mit dem Rest Ihres Designs ins Gleichgewicht zu bringen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ebene",
      tore: [36, 6, 10, 15],
      quelle: "Die Energie Ihres Kreuzes besteht darin, ein Gleichgewicht in der Intimität mit den Menschen in Ihrem Leben zu finden. Ihre Energien sind getrieben, das persönliche Vergnügen zu finden, das Sie brauchen, aber dies mit Ihrem Leben, wie es in das Kollektiv passt, in Einklang zu bringen. Auf der einen Seite haben Sie diesen Drang, sich einen Ihrer Träume zu schnappen und in die Höhle zu rennen, um allein zu sein, und auf der anderen Seite, Teil der Gruppe am Lagerfeuer zu sein. Die Balance zu finden und zu zeigen, ist das entscheidende Geschenk, das Sie in diese Welt einbringen können.",
    },
  },
  37: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Planung",
      tore: [37, 40, 9, 16],
      quelle: "Die Energie in Ihrem Kreuz besteht darin, Abmachungen und Schnäppchen als Teil der Gemeinschaftsbildung zu schaffen. Die Struktur von Gemeinschaften und Institutionen besteht aus diesen Abmachungen oder Kompromissen. Zum Beispiel zahlen wir lokale Steuern, damit wir öffentliche Schulen und Verkehrsmittel haben können, neben anderen Vorteilen für die Gemeinschaft. Ihre Energie ist bestrebt, zur Schaffung, Stärkung oder Aufrechterhaltung von Gemeinschaft beizutragen, in welcher Form auch immer das geschieht.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Abmachungen",
      tore: [37, 40, 5, 35],
      quelle: "Bei der Energie in Ihrem Kreuz geht es darum, Abmachungen zu treffen und Schnäppchen zu machen, die zu Ihnen selbst und vielleicht auch zum Aufbau einer Gemeinschaft beitragen. Es besteht das Potential, in allem ein Geben und Nehmen zu finden, und die Energie, die Sie in sich tragen, wird sich stark dahingehend äussern, dass Sie für jede Aktion, die Sie unternehmen, etwas zurückbekommen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Migration",
      tore: [37, 40, 5, 35],
      quelle: "Ihre Energie ist es, einen Ausbruch aus den bestehenden Gemeinschaften und Gruppen zu suchen, die aufgebaut sind. Wenn man in einer Gemeinschaft lebt, macht man Abmachungen und bringt Opfer, um es allen recht zu machen (z. B. Steuern zahlen, damit Schulen gebaut werden können). Irgendwann merkt die Gemeinschaft, dass sie es nicht allen recht machen kann. Ihre Energie ist dazu da, die Stimme zu sein, um zu erkennen, dass der Kompromiss zu weit gegangen ist und wir weitergehen und neu anfangen müssen, aufzubauen. Ihre Stimme trägt zum Aufbau der Gemeinschaft bei.",
    },
  },
  38: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Spannung 4",
      tore: [38, 39, 48, 21],
      quelle: "Ihr Kreuz basiert auf einer Energie, die nach einem Ziel sucht und bereit ist, dafür zu kämpfen, um es zu erreichen. Aufgrund dieser Eigenschaft ist es für Sie von grösster Wichtigkeit, einen Sinn in Ihrem Leben zu finden. Das Leben Ihres Human Design Typs und Ihrer Strategie ist der Schlüssel, um diesen Zweck zu finden, denn genau so funktioniert die Energie. Wenn Sie den Sinn nicht finden, werden Sie wahrscheinlich mit Ziel- und Richtungslosigkeit zu kämpfen haben. Folgen Sie Ihrer Strategie und hören Sie auf Ihre innere Stimme. Setzen Sie diese Energie, sich durchzukämpfen, für einen guten Zweck ein.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Opposition",
      tore: [38, 39, 57, 51],
      quelle: "Sie sind hier, um eine entgegengesetzte Kraft zu fast allem zu sein, was Ihnen begegnet. Durch diese Opposition werden Sie andere dazu bringen, sich für das zu rechtfertigen, was sie tun, wovon sie reden oder was sie verkaufen. Das ist ein wichtiger Prozess, sowohl für Sie als auch für andere, denn durch den Rechtfertigungsprozess kann die Gesellschaft beginnen zu erkennen, welche Ideen legitim sind und welche voller Löcher stecken. Sie schaffen einen Mehrwert für alle, die an dem Gespräch beteiligt sind, weil Sie die richtigen Fragen stellen und die Knöpfe drücken, um die zugrunde liegende Wahrheit zu enthüllen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Individualismus 2",
      tore: [38, 39, 57, 51],
      quelle: "Ihr Kreuz trägt Energie, um andere zu provozieren und Spannung zu erzeugen. Durch Provokation erzeugen Sie Spannungen in Ihrer Umgebung. Situationen können manchmal hitzig werden, weil die Leute sich bei Ihnen entladen werden. Energetisch sind Sie jedoch dazu bereit und es scheint Sie nicht zu stören. Was Sie tun, ist, sie zu zwingen, eine Position einzunehmen und sie dazu zu bringen, diese zu rechtfertigen. Sie wissen wahrscheinlich nicht einmal, dass Sie das tun, aber Ihre Energie gibt den Leuten hier oder da einen kleinen Schubs, und dann sind sie plötzlich aufgewühlt. Durch diesen Tanz wollen Sie die Menschen in Bewegung bringen, ihre Emotionen in Gang setzen und sie dazu bringen, einen Sinn in ihrem Leben zu finden.",
    },
  },
  39: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Spannung 2",
      tore: [39, 38, 21, 48],
      quelle: "Sie wurden mit der Gabe geboren, die Knöpfe der Leute zu drücken. Das kann zwar einige negative Reaktionen hervorrufen, aber das Ziel der Provokation ist es, den richtigen Geist in der Reaktion zu finden. Diejenigen, die Sie provozieren, erhalten ein \"Geschenk\", da sie die Möglichkeit haben, an dem zu arbeiten, was Sie in ihnen provoziert haben. Sie sehen das vielleicht nicht immer so, seien Sie also vorgewarnt. Ihr Ziel ist es, Spannung zu erzeugen, die eine Reaktion hervorruft, typischerweise in Form einer Tirade oder eines emotionalen Ausdrucks. Aus dieser Reaktion entsteht die Saat der Information, die durch Analyse dazu führen kann, dass der andere einen emotionalen Weg zum Geist findet.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Provokation",
      tore: [39, 38, 51, 57],
      quelle: "Sie tragen den Plan in sich, auf andere in Ihrer Umgebung zutiefst provozierend zu wirken. Das Ziel dieser Provokation ist es, eine Reaktion und Bewegung in dem Bereich zu erzeugen, den Sie provozieren. Wenn es für den anderen nicht etwas gäbe, an dem er arbeiten oder das er untersuchen könnte, würden Sie keine solche Reaktion hervorrufen. Machen Sie sich klar, dass nicht jeder bereit ist, an Dingen zu arbeiten, also achten Sie auf Ihr Timing, sonst bekommen Sie vielleicht mehr, als Sie wollen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Individualismus",
      tore: [39, 38, 51, 57],
      quelle: "Sie sind hier, um ein Individuum zu sein. Die Energien in Ihrem Kreuz sind alle von individueller Natur. Es geht nicht darum, sozial oder in einer Gemeinschaft zu sein. Nicht, dass Sie das nicht könnten, aber letztlich sind Sie hier, um nach Ihrer eigenen Pfeife zu tanzen. Das ist ein wertvoller Beitrag zur Gesellschaft, da es uns die Möglichkeit gibt, Ihren Ausdruck zu betrachten und Teile davon zu übernehmen, wenn wir dazu inspiriert sind. Allerdings kann es andere, die eher gemeinschaftsorientiert sind, verärgern, da es sich stark von dem unterscheidet, was sie akzeptieren, also kann es provozierend sein. Diese Provokation ist es, die letztlich zu Veränderungen führt.",
    },
  },
  40: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Planung 3",
      tore: [40, 37, 16, 9],
      quelle: "Bei Ihrem Kreuz geht es darum, die Kosten von Gemeinschaftsprojekten zu bewerten. Hier geht es um die Bewertung der Gegenleistung. ''Wie viel Arbeit ist nötig und was ist der Ertrag?'' Ihr Kreuz hat den Kanal der Gemeinschaft, aber mit dem Übergang vom Individuum zur Gemeinschaft müssen wir Dinge aufgeben, um uns anzupassen. Wir müssen entweder Geld oder Arbeit abgeben, um diese Gemeinschaft aufzubauen und ein Teil von ihr zu sein. Ihr Kreuz ist hier, um zu sagen: \"Ich mag die Idee, aber ist sie die Kosten wert?",
    },
    juxta: {
      name: "Juxtapositionskreuz der Verweigerung",
      tore: [40, 37, 35, 5],
      quelle: "Du bist hier, um die Bremse zu sein, wenn wir uns hinreissen lassen. Du bist hier, um die Stimme der Besorgnis zu erheben, dass wir das bereits getan haben. Dein Kreuz trägt die Energie des Widerstands und das ist eine wichtige Energie für den Rest der Gesellschaft. Ohne sie können wir uns in dem, was wir tun, verstricken und direkt von der Klippe stürzen. Du bist hier, um Dinge in Frage zu stellen oder zu verleugnen, damit der Rest von uns aus dem emotionalen Rhythmus herauskommt und etwas Energie aufwendet, um die gegenwärtige Vorgehensweise zu rechtfertigen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Migration 2",
      tore: [40, 37, 35, 5],
      quelle: "Ihr Kreuz hat die Energie, weiterzuziehen, wenn eine unmittelbare Bedrohung besteht. Das kann wortwörtlich ein Umzug sein oder sich auch auf das beziehen, was Sie tun oder woran Sie glauben. Ihre Wanderung basiert auf Überleben und Flucht, um zu überleben. Sie werden sich bis zu dem Punkt verleugnen, an dem Sie überzeugt sind, dass Sie weiterziehen müssen. Das kann sich in Ihrer Karriere manifestieren, in der Sie um jeden Preis dranbleiben, bis Sie schliesslich glauben, dass die Zeichen der Zeit an der Wand stehen und Sie in einen anderen Beruf fliehen.",
    },
  },
  41: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Unerwarteten 4",
      tore: [41, 31, 28, 27],
      quelle: "Ihr Kreuz hat die Energie, auf das Unerwartete zu stossen und durch diese Erfahrung etwas vorwärts zu bringen. Was Sie vorwärts bringen, ist zum Zeitpunkt der Erfahrung nicht bekannt. Ihre Energie wird Sie dazu treiben, Erwartungen darüber zu haben, was aus dieser Entdeckung werden wird, aber diese Erwartungen werden vielleicht nicht erfüllt. Es gibt einen alten Werbespot, in dem ein Mann, der Schokolade isst, mit einer Frau zusammenstösst, die Erdnussbutter isst. Die Fantasie enthüllt das Produkt Reese's Peanut Butter Cups und wie Sie wahrscheinlich wissen, führte dieses scheinbar unerwartete Ereignis zu einem erfolgreichen Ergebnis, obwohl die Kombination leicht furchtbar hätte schmecken können. Sie sind hier, um die Entdeckung zu machen und sie weiterzugeben. Erwarten Sie das Unerwartete in Ihrem Leben.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Phantasie",
      tore: [41, 31, 44, 24],
      quelle: "Bei der Energie in Ihrem Kreuz geht es um Erwartung und Phantasie über das, was passieren wird. Diese Energie ist gut im Erkennen von Trends, da sie vorhersagen kann, was als Nächstes kommt. Die Vorhersage ist nicht immer richtig, da es sich um Phantasie handelt, aber sie hat eine Grundlage in dem beobachteten Muster. Diese Energie ist stark mit der Antizipation von Emotionen verbunden, die aus der Phantasie stammen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Alpha 2",
      tore: [41, 31, 44, 24],
      quelle: "Ihr Kreuz hat die Energie, andere zu führen. Oft werden Sie auf die Gelegenheit warten müssen, diese Führung zu übernehmen, aber wenn es passiert, werden Sie bereit sein. Sie haben die Fähigkeit zu führen, weil Sie eine emotionale Vision anbieten, der andere zu folgen bereit sind. Sie müssen Ihrem Human Design Typ und Ihrer Strategie folgen, und die Gelegenheit zum Führen wird sich Ihnen bieten.",
    },
  },
  42: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Maya",
      tore: [42, 32, 61, 62],
      quelle: "Dies ist das Kreuz, das von Abgeschlossenheit bestimmt ist. Es ist wichtig für Sie, das zu verfolgen, wofür Sie eine Leidenschaft haben, mit einem Umfang, der erreichbar ist, ungeachtet der Herausforderungen, denen Sie sich stellen müssen. Ihr Antrieb, einen Abschluss zu finden, ist nur dann erfüllt, wenn Sie die Umgebung und alles, was Ihre Realität ausmacht, berücksichtigen. Vollständig zu verstehen, wie Ihre Umgebung funktioniert, ist wirklich der Schlüssel, um mit diesem Kreuz in Frieden zu sein.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Vollendung",
      tore: [42, 32, 60, 56],
      quelle: "Die Energie Ihres Kreuzes ist der Antrieb, Dinge zu vollenden. Lange nachdem andere aufgegeben haben, stapfen Sie weiter und weiter, bis Sie die Ziellinie überschreiten. Forschung ist oft ein Beruf oder ein Hobby, dem Menschen mit Ihrer Energie verfallen. Der Trick bei Ihrem Kreuz ist, sich auf etwas einzulassen, das Sie in einem vernünftigen Zeitrahmen oder mit einer greifbaren Definition abschliessen können. Die Ehe ist eine ernsthafte Verpflichtung für Ihr Design, da Sie dazu getrieben werden, es auf Gedeih und Verderb zu vollenden.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Begrenzung",
      tore: [42, 32, 60, 56],
      quelle: "Sie sind hier, um anderen Grenzen aufzuerlegen. Die Begrenzung kann abrupt kommen, wie z. B. \"Du kannst das nicht tun\" oder \"Du kannst damit nicht weitermachen\". Aber die Begrenzung ist wichtig. Sie bewahrt uns davor, endlos und ohne Struktur umherzuwandern. Sie hilft, Klarheit zu schaffen, da wir uns innerhalb der Grenzen der Begrenzung konzentrieren können. Sie kann sicherheitsorientiert sein, wie \"Du darfst nachts nicht nach draussen gehen\". Aber ihre Schroffheit kommt vom Mangel an Erklärung. Ihre Tendenz wird sein, die Grenzen zu setzen und den Grund dafür nicht mitzuteilen. Das wird nicht immer auf Gegenliebe stossen, also bemühen Sie sich, sich zu erklären.",
    },
  },
  43: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Erläuterung 4",
      tore: [43, 23, 4, 49],
      quelle: "Ihr Kreuz hat die Energie, die dazu angetrieben wird, der Welt eine Erklärung zu geben. Das ist nicht immer eine einfache Aufgabe, weil Sie versuchen zu erklären, was Sie bereits wissen. Das ist ein sehr individuelles Wissen, und wenn andere versuchen, es zu verstehen, möchten Sie vielleicht aufhören und einfach sagen: \"Ich weiss, weil ich es weiss! Wahrscheinlicher ist, dass Sie weitermachen, weil es Sie antreibt, diese Information zu vermitteln, und deshalb erklären Sie weiter. Ihre Mission ist es, diesen individuellen Gedanken ans Licht zu bringen, denn was Sie zu erklären versuchen, kann ein Geniestreich sein.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Einsicht",
      tore: [43, 23, 29, 30],
      quelle: "Sie werden einen Grossteil Ihres Lebens damit verbringen, \"Aha!\" zu sagen. Sie haben die Einsicht, bei der es darum geht, abstrakte Informationen zusammenzuziehen und sie zu verbinden. Leider haben Sie vielleicht Schwierigkeiten, sich zu erklären. Dieser Prozess ist nicht logisch und Erklärungen, die andere verstehen können, beinhalten normalerweise Logik, aber es gibt keine Logik. Es geht einfach darum, die Teile des Puzzles in einem Augenblick zusammenzusetzen, und schon haben Sie es - \"Aha!",
    },
    links: {
      name: "Linkswinkliges Kreuz der Hingabe 2",
      tore: [43, 23, 29, 30],
      quelle: "Sie haben die Energie, Ihre \"Ich weiss \"s der Welt mitzuteilen. Ihre Energie wird dazu angetrieben, Ihre Einsicht zu erklären und sie dann anderen zur Verdauung zu überlassen. Ihre Einsicht ist individuell, daher kann es eine Weile dauern, bis sie vom Rest der Gruppe adaptiert wird. Manchmal wird sie für andere zu unterschiedlich sein, um überhaupt aufgenommen zu werden. Sie sind hier, um diese Leckerbissen auszusprechen, und der Rest von uns wird das Verständnis entweder übernehmen oder nicht.",
    },
  },
  44: {
    rechts: {
      name: "Rechtswinkliges Kreuz der vier Wege 3",
      tore: [44, 24, 33, 19],
      quelle: "Ihr Kreuz hat die Energie, basierend auf der Vergangenheit zu führen und zu lenken. Dies ist die Energie des Managements von Menschen, um für die Gruppe oder den Stamm zu sorgen. Basierend auf Ihrer instinktiven Erfahrung können Sie diese Ressourcen lenken. Wie eine altmodische Gemeinschaft oder ein Familienunternehmen sind Sie derjenige, der die Aufgaben verteilt, damit alles zusammenkommt und die Gemeinschaft alles hat, was sie braucht. Sie sind hier, um diese Rolle für Ihre Gruppe zu übernehmen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Wachsamkeit",
      tore: [44, 24, 7, 13],
      quelle: "Sie sind hier, um ein Wachhund für das Universum zu sein, oder zumindest für Ihr Universum. Ihr Kreuz gibt Ihnen die Energie, wachsam zu sein und Probleme oder ein Muster zu bemerken, das schädlich ist. Aus diesem Grund sind Sie der Erste, der es bemerkt. Sie werden es sehen, bevor jemand anderes darauf achtet. Wenn das, was Sie bemerken, für die Gruppe wichtig ist, nutzen Sie Ihren Human Design Typ und Ihre Strategie, um Massnahmen zu ergreifen, und die Leute werden Ihre Warnung beherzigen, andernfalls werden Sie der Junge sein, der Wolf rief.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Inkarnation 2",
      tore: [44, 24, 7, 13],
      quelle: "Ihr Kreuz hat die Energie des Zyklus. Sie überprüfen die Dinge immer und immer wieder, um zu sehen, ob sie richtig sind und ob es genug ist. Getrieben von der Angst, nicht genug zu haben, werden Sie die Dinge immer wieder umdrehen. Ihre Aufgabe ist es, die anderen in der Gruppe, der Familie, der Gemeinschaft oder der Firma wissen zu lassen, wenn etwas schief läuft, und dann die Verjüngung zu leiten, um es noch einmal richtig zu machen.",
    },
  },
  45: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Herrschers 2",
      tore: [45, 26, 22, 47],
      quelle: "Bei der Energie Ihres Herrscherkreuzes geht es darum, die Macht zu übernehmen und Ihr Stück Land zu kontrollieren. Das muss nicht unbedingt ein ganzes Land sein, und in der Tat ist es vielleicht gar kein Land. Aber Sie werden dazu getrieben, die Kontrolle über etwas zu haben. Vielleicht ist es Ihre Wohnung oder Ihr Haus oder eine Abteilung oder ein Geschäftsbereich bei der Arbeit. Was auch immer es ist, es wird den Drang geben, die Herrschaft darüber zu haben. Herrschaft ist sehr wichtig, denn sie bringt Struktur ins Chaos. Herrschen ist das, wozu Sie hier sind.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Besitzes",
      tore: [45, 26, 36, 6],
      quelle: "Die Energie, die Ihr Kreuz mit sich bringt, besteht darin, die Menschen in Ihrem Leben zu besitzen. Sie haben den Wunsch, Kontrolle und Besitz über diejenigen zu haben, mit denen Sie zu tun haben. Es ist wichtig, dass Sie Ihrem Typ und Ihrer Strategie folgen, denn sonst werden die Menschen, die Sie zu beherrschen versuchen, Sie nicht akzeptieren und sich über Ihre Beziehung ärgern oder sogar wütend werden. Wenn Sie eingeladen werden müssen, dann warten Sie, bis Sie eingeladen werden. Wenn Sie antworten müssen, dann warten Sie mit dem Antworten. Wenn Sie informieren müssen, dann informieren Sie. Das Befolgen Ihres Human Design Typs und Ihrer Strategie ist entscheidend dafür, dass Ihr Kreuz für andere und vor allem für Sie selbst funktioniert.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Konfrontation",
      tore: [45, 26, 36, 6],
      quelle: "Dies ist eine Energie, die von aussen kommt und die Kontrolle über das übernimmt, was rechtmässig Ihnen gehört. In der Gesellschaft und im Geschäftsleben wird es immer ein Management oder eine Kontrolle geben, die mit der Zeit stagniert. Dieses Kreuz ist dazu da, die Dinge aufzurütteln, normalerweise von aussen. Wie ein Corporate Raider, der kommt, um die Teile eines grossen Unternehmens zu optimieren, ist dies Energie, um die Kontrolle zu übernehmen und zu einer stromlinienförmigen und profitablen Konfiguration zu führen. Es geht hier nicht nur um die Regierung oder die Wirtschaft, diese Kraft wird auch in Ihrem persönlichen Leben oder in Ihrer Gemeinschaft wirken. Der eigentliche Antrieb ist hier Macht und Kontrolle.",
    },
  },
  46: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Gefässes der Liebe 3",
      tore: [46, 25, 15, 10],
      quelle: "Sie bringen die Energie der Liebe des Lebens. Du stehst auf deinen Körper und alles, was ihn betrifft. Es geht Ihnen darum, dieses irdische Dasein zu erleben und es auf eine liebevolle Weise zu tun. Du bist hier, um Liebe zu sein, und der Schlüssel für dich ist, dass sie eine Sinnlichkeit in sich trägt. Du bist hier, um anderen zu zeigen, wie man es liebt, lebendig zu sein.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Serendipität",
      tore: [46, 25, 52, 58],
      quelle: "Sie sind hier, um zur richtigen Zeit am richtigen Ort zu sein. Dazu gehört auch, im Körper zu sein und ihn zu geniessen, ja sogar zu lieben. Sie haben eine Liebe für diese irdische Erfahrung und Sie teilen diese mit der Welt. Sie sind ein Opportunist und werden Ihre Fähigkeit, glückliche Zufälle zu erleben, mit anderen teilen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Heilung 2",
      tore: [46, 25, 52, 58],
      quelle: "Sie sind hier, um Liebe zu sein und durch Liebe zu heilen. Die Energie Ihres Kreuzes unterstützt Sie dabei, dies mit anderen zu tun. Ihre Energie ist auf die Liebe zum Körper und das Sein im Körper ausgerichtet. Sie sehen vielleicht nicht immer viel zurück, aber Ihre Kraft der Heilung durch Liebe wird einen grossen Unterschied in der Welt um Sie herum machen.",
    },
  },
  47: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Herrschers 3",
      tore: [47, 22, 45, 26],
      quelle: "Sie sind hier, um aus der Vergangenheit einen Sinn zu machen. Ihre Energie bringt die Ereignisse aus der Vergangenheit nach vorne und gibt das vollständige Bild in der Gegenwart. Sie können dies nutzen, um zu führen, oder Sie können es einfach nutzen, um Ihre Welt zu beherrschen, was auch immer diese Leidenschaft für Sie ist. Sie werden immer mehr Sinn machen und eine bessere Verbindung zu den Menschen in Ihrem Leben haben, wenn Sie die Vergangenheit in das, was Sie jetzt tun, integrieren. Es ist diese Kontinuität, die Sie anbieten, um anderen zu helfen, sich zu verbinden und sich im Einklang zu fühlen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Unterdrückung",
      tore: [47, 22, 12, 11],
      quelle: "Die Energie Ihres Kreuzes besteht darin, Ideen ins Leben zu rufen, die Vergangenheit, Gegenwart und Zukunft miteinander verbinden. Einige Ihrer Ideen können sich bedrückend anfühlen, aber diese Schwere übt auch Druck auf den Rest aus, sie auf ihre Gültigkeit zu überprüfen. Sie sind hier, um diese Ideen auszusprechen und es dem Rest von uns zu überlassen, sie voranzutreiben oder sie abzuschiessen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Informierens 2",
      tore: [47, 22, 12, 11],
      quelle: "Dies ist ein Herrscherkreuz und trägt die Energie, offen und fürsorglich zu sein. Sie sind hier, um sozial und informativ zu sein. Sie tragen die Energie in sich, die sich um das grosse Ganze kümmert. Ihre Energie wird wahrscheinlich Informationen durch Kunst, Gesang oder andere expressionistische Medien hervorbringen.",
    },
  },
  48: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Spannung 3",
      tore: [48, 21, 39, 38],
      quelle: "Ihr Kreuz bringt sehr viel Tiefe. Sie haben einen Drang zu wissen und zu verstehen. Sie verspüren die Spannung, sich Fähigkeiten anzueignen, die Sie dabei unterstützen, die Dinge in der Tiefe zu tun. Nur wenn Sie in der Lage sind, sich in den Fluss zu entspannen, werden Sie feststellen, dass die Fähigkeiten, die Sie brauchen, zu Ihnen kommen werden, wenn Sie sie brauchen, indem Sie Ihren Human Design Typ und Ihre Strategie leben. Vertrauen Sie darauf, dass, wenn Sie diesen Prozess zulassen, diese Fähigkeiten die Tiefe haben werden, die Sie benötigen, um erfolgreich zu sein. Sie sind hier, um Tiefe zu bringen und sich von der Spannung zu lösen, die Sie zwingt, endlos nach Talenten zu suchen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Tiefe",
      tore: [48, 21, 53, 54],
      quelle: "Bei Ihrem Kreuz dreht sich alles um Tiefe, um Ihre Fähigkeit, Dinge auf eine sehr tiefe Art und Weise zu tun. Sie werden für Ihre Tiefe bemerkt werden und durch Ihr soziales Netzwerk werden Sie Gelegenheit finden, sich auszuzeichnen. Ihre Inspiration für Tiefe wird andere dazu motivieren, eine bessere und logischere Art und Weise zu schaffen, Dinge zu tun.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Bestrebens 2",
      tore: [48, 21, 53, 54],
      quelle: "Sie bringen die Energie der Tiefe mit und sind hier, um Ihre Tiefe in die Welt einzubringen. Ihr Kreuz ist auf andere angewiesen, um diesen tiefen Beitrag zu leisten. Sie neigen vielleicht dazu, es satt zu haben, darauf zu warten, dass diese Verbindung mit anderen zustande kommt. Haben Sie Geduld und denken Sie daran, sich in den Fluss zu entspannen und auf die richtige Begegnung zu warten, in der Ihre Tiefe zum Vorschein kommen kann. Diese Tiefe kann sich auf jedes Interessengebiet beziehen. Der Antrieb wird sein, ein tieferes Verständnis zu schaffen, damit der Prozess, das Produkt oder das System besser gemacht werden kann und mehr Freude ins Leben bringt.",
    },
  },
  49: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Erläuterung",
      tore: [49, 4, 43, 23],
      quelle: "Ihr Kreuz trägt revolutionäre, mutative Energie. Diese Energie hat Spannung und Aggression, weil sie emotional ist. Die Versorgung mit Nahrung spielt in diesem Kreuz eine grosse Rolle und Sie haben den Antrieb, der uns dazu bringt, Massnahmen zu ergreifen, um das Bedürfnis unseres Körpers nach Nahrung zu befriedigen. Das Kreuz heisst Erklärung, weil es einen Druck gibt, zu erklären, was es mit Ihrer Mutation auf sich hat. Ihre Revolution ist individueller Natur, so dass andere vielleicht Schwierigkeiten haben, Ihnen zu folgen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Prinzipien",
      tore: [49, 4, 14, 8],
      quelle: "Ihr Kreuz trägt die Energie des Stehens auf Prinzipien. Es trägt auch die Energie der Revolution oder des Wandels. Sie haben einen fundamentalen Drang, für das Richtige einzutreten, insbesondere für die Menschenrechte. Ein zentrales Thema ist die Beschaffung von Nahrung, denn wir müssen Nahrung haben, um uns zu ernähren. Machen Sie sich bewusst, dass Sie vielleicht Ihrer Zeit voraus sind und sich leidenschaftlich einsetzen, bevor der Rest des Kollektivs die Bedrohung oder das Problem erkennt, das Sie so klar sehen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Revolution",
      tore: [49, 4, 14, 8],
      quelle: "Dies ist die Energie der Revolution und der Veränderung - solange sie einen Nutzen für das Gemeinwohl schafft. Essen ist ein zentrales Thema rund um die Revolution und das schon seit langer Zeit. In einer Art \"Robin Hood\"-Manier sehen Sie die Notwendigkeit, andere, die weniger Glück haben, zu versorgen.",
    },
  },
  50: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Gesetzmässigkeiten 3",
      tore: [50, 3, 56, 60],
      quelle: "Ihr Kreuz hat die Energie, Gesetze für den Stamm zu machen. Damit ein Stamm überleben kann, muss jemand jagen oder das Essen sammeln, jemand muss das Essen kochen und dann muss es eine Ordnung geben, wer das Essen verzehrt und wie das geschieht. Heute sind viele von uns weit von der Zeit des Lagerfeuers entfernt, aber die Prinzipien gelten immer noch. Ihre Gabe ist es, die Regeln festzulegen, damit die Familie, die Gemeinschaft oder die Organisation auf eine produktive, weniger chaotische Art und Weise funktionieren und eine bessere Organisation erreichen kann. Als Gesetzgeber müssen Sie jedoch offen für Feedback sein, weil der Rest der Gruppe mit Ihnen leben muss. Typischerweise werden Ihre Normen für die Gesetzgebung vererbt und Sie sind weniger offen für Input von aussen. Wenn die Mitglieder Ihres Stammes nicht mit den von Ihnen aufgestellten Regeln leben können und Sie nicht offen für Verhandlungen sind, dann muss der eine oder andere gehen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Werte",
      tore: [50, 3, 31, 41],
      quelle: "Ihre Energie ist es, Regeln und Gesetze aufzustellen, aber Sie tun es mit einem nachsichtigen Stil. Sie sind hier, um der Gruppe oder Familie zu helfen, Ordnungsregeln und Werte aufzustellen. Ihre Energie ist es, den Prozess zu unterstützen, der dazu beiträgt, die Gruppe davor zu bewahren, im Chaos zu versinken. Sie haben nicht die steife Oberhand, sondern sehen die Weisheit der Umstände und können sich beugen und verhandeln, wenn es nötig ist.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Wünsche 2",
      tore: [50, 3, 31, 41],
      quelle: "Sie sind hier, um die bestehenden Systeme und Strukturen zu betrachten und Ihre eigene Sichtweise anzubieten, wie die Dinge anders sein könnten. Das kann manchmal unpopulär sein, weil Menschen nicht immer bereit sind, etwas aufzugeben, das sie lange Zeit beherrscht hat. Ungeachtet dessen müssen Sie den Standpunkt vertreten, dass bestimmte Dinge nicht passen oder keinen Sinn machen. Sie müssen klug damit umgehen, wann Sie Ihre Träume und Wünsche mitteilen, sonst könnten Sie aus der Gruppe, die Sie Gemeinschaft nennen, vertrieben werden.",
    },
  },
  51: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Durchdringung",
      tore: [51, 57, 54, 53],
      quelle: "Sie sind hier, um mit Ihrer schockierenden und durchdringenden Energie auf den Punkt zu kommen. Bei Ihrem Kreuz geht es darum, alle Extras durchzuschneiden und direkt zum Kern der Sache zu kommen oder ohne viel Schnickschnack die Antwort zu finden. Sie werden dies wahrscheinlich auf schockierende Weise und mit \"Galle\" tun, da Ihre Führungsenergie mit der Gallenblase verbunden ist. In Ihrem Bemühen, so unverblümt zu sein, helfen Sie vielleicht anderen, den Weg frei zu machen, obwohl das für Ihr Bedürfnis, es zu tun und zu erledigen, zweitrangig ist.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Schocks",
      tore: [51, 57, 61, 62],
      quelle: "Die Energie Ihres Kreuzes ist darauf ausgerichtet, Menschen zu schockieren. Es ist Ihnen gleichgültig, ob das, was Sie sagen oder tun, um zu schockieren, tatsächlich wahr ist, denn es geht nur um den Schock um des Schocks willen. Aus dem Schock kommt die Reaktion und aus dem Ort der Selbstgefälligkeit kann die Veränderung kommen. Die Bewegung weg von Lethargie und Selbstgefälligkeit ist das, was Sie hier tun sollen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Weckrufs",
      tore: [51, 57, 61, 62],
      quelle: "Die Energie Ihres Kreuzes soll einen Schock bringen und das Potenzial für Veränderungen bei denen schaffen, die dazu bereit sind. Das bedeutet nicht, dass die Menschen am empfangenden Ende nicht mit einem Keuchen oder \"Wie konntest du nur?\" reagieren werden. Auf einer tieferen Ebene haben sie auf den Schock gewartet, der sie zur Veränderung bewegt. Hier ist einfach Energie am Werk, und Ihr Schock braucht einen Rezeptor. Die Energie wird Sie auf natürliche Weise zu denjenigen führen, die auf irgendeiner Ebene für den Schock bereit sind, sich zu verändern und weiterzugehen.",
    },
  },
  52: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Dienstes 2",
      tore: [52, 58, 17, 18],
      quelle: "Das Design Ihres Kreuzes ist es, andere zu führen und zu korrigieren. Mit Ihrer Führungsenergie, die aus dem 52. Tor kommt, werden Sie Ihre Führung von einem Punkt der Stille aus machen. Wie ein Berater, der in einem Büro sitzt, werden die Menschen Sie aufsuchen, um Ihren Rat und Ihre Meinung über ihre Situation zu hören. Es ist wichtig, dass Sie Ihrer Art und Strategie folgen, wenn Sie Ihre Meinungen und Korrekturen anbieten, da dies zu positiveren Ergebnissen führen wird.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Stille",
      tore: [52, 58, 21, 48],
      quelle: "Die Energie Ihres Kreuzes besteht darin, weise Ratschläge zu erteilen, wenn man Sie darum bittet. Sie haben eine angeborene Stille in sich, die danach verlangt, erkannt zu werden. Von diesem Punkt der Stille aus finden Sie Klarheit über alles, was um Sie herum ist. Sie werden grossartige Ideen und Lösungen anbieten, wenn Menschen zu Ihnen kommen und Sie um Rat fragen. Denken Sie daran, dass eine initiierende Beraterrolle nicht Ihrer Natur entspricht. Ihr Fachwissen hat eine besondere Wirkung, wenn Sie es aus diesem Punkt der Stille heraus ansprechen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Forderungen",
      tore: [52, 58, 21, 48],
      quelle: "Ihr Kreuz trägt den Antrieb, darauf hinzuweisen, was in der Gesellschaft nicht funktioniert. Sie sind hier, um zu fordern, dass jemand etwas unternimmt und das Problem korrigiert oder die Lösung findet. Diese Energie basiert auf kollektiver Sorge, es geht also nicht um eine individuelle Situation. Es geht um ein Problem oder eine gesellschaftliche Dysfunktion, die das grössere Kollektiv betrifft. Sie sind hier, um Stellung zu beziehen und Ihrer Stimme Gehör zu verschaffen. Sie haben nur begrenzte Energie, um dies zu tun, also müssen Sie Ihrem Human Design- Typ und Ihrer Strategie folgen, um effektiv zu sein. Sie können sich auch auf andere verlassen, die sich engagieren und die Veränderung bewirken.",
    },
  },
  53: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Durchdringung 2",
      tore: [53, 54, 51, 57],
      quelle: "Ihr Kreuz trägt die Energie des Beginns oder der Initiierung von etwas Neuem. Sie werden immer den Ehrgeiz haben, Dinge zu verändern oder neu zu beginnen. Bei Gelegenheiten, die sich Ihnen bieten, werden Sie es vorziehen, von Grund auf neu einzusteigen, anstatt sich an etwas Altes und Bewährtes zu halten. Sie sind hier, um eine initiierende Kraft mit durchdringender Energie zu sein und für Ihren Beitrag anerkannt zu werden. Sie wollen sehen, dass das, woran Sie arbeiten, im grossen Stil umgesetzt wird. Diese Fähigkeit, zu initiieren, wird am erfolgreichsten sein, wenn Sie Ihrem Human Design Typ und Ihrer Strategie folgen. Sie sind dazu da, von Anfang an an dem beteiligt zu sein, wofür Sie sich leidenschaftlich einsetzen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Anfänge",
      tore: [53, 54, 42, 32],
      quelle: "Die Energie in Ihrem Kreuz bringt eine einzigartige Mischung aus Initiation und Transformation. Ihr Zeichen ist perfekt für Projektmanagement aller Art, denn Sie haben die Energie, die Kosten und den Umfang abzuschätzen und die möglichen Ressourcen und ihren Mehrwert für das Projekt zu bewerten. Dies kann für grosse und kleine Projekte gelten. Die Leute werden Ihr Talent suchen, da Sie die Energie haben, Projekte in Gang zu bringen, die benötigten Ressourcen einzuschätzen und die für eine erfolgreiche Durchführung erforderlichen Veränderungen einzuleiten.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Zyklen",
      tore: [53, 54, 42, 32],
      quelle: "Sie bringen die Energie der nie endenden Zyklen voran. Dies ist die Geschichte der Evolution. Veränderung ist konstant und sie verläuft in Zyklen. Zyklen haben Abschnitte des Anfangs, der Transformation, der Reifung und der Vollendung, und dann beginnt alles wieder von vorne. Sie bringen all diese Energien nach vorne. Sie sind hier, um die sich wiederholenden und sich ständig verändernden Zyklen der Evolution zu ertragen und zu meistern.",
    },
  },
  54: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Durchdringung 4",
      tore: [54, 53, 57, 51],
      quelle: "Ihr Kreuz trägt die Energie, durch Ihren Ehrgeiz wahrgenommen zu werden. Aufgrund Ihres ehrgeizigen Ansatzes werden die Menschen erkennen, was Sie tun. Sie tragen auch die Energie, um auf den Punkt zu kommen. Sie werden wahrscheinlich nicht um den heissen Brei herumreden - kommen Sie einfach zur Sache und erledigen Sie es. Das kann sowohl positiv als auch negativ sein, je nachdem, was andere von Ihnen erwarten. Wenn man Sie bittet, bei einer Aufgabe gründlich zu sein, kann Ihre Tendenz, sie ebenso schnell und einfach zu erledigen, zu unerfüllten Erwartungen führen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Ehrgeizes",
      tore: [54, 53, 32, 42],
      quelle: "Ihr Kreuz trägt die Energie, Verpflichtungen einzugehen und sie bis zur Vollendung durchzuziehen. Sie haben den Antrieb, vorwärts zu drängen und die Arbeit zu erledigen. Es ist wichtig, dass Sie Ihren Human Design Typ und Ihre Strategie leben und die Dinge in Ihrem Leben finden, für die sich Ihre Seele einsetzen möchte. Hören Sie auf die Stimme tief in Ihnen, die sagt: \"Das ist genau das, was ich tun sollte! Hören Sie auf diese Stimme, leben Sie Ihr Design und gehen Sie die Verpflichtung ein. Sie haben den Entwurf, um dabei zu bleiben und es geschehen zu lassen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Zyklen 2",
      tore: [54, 53, 32, 42],
      quelle: "Ihr Zeichen hat eine sehr kraftvolle, transformatorische Energie, um Dinge zu erledigen. Ihr Kreuz ist mit den Zyklen verbunden, die alles Leben durchläuft. Sie verstehen, dass alles geboren wird, dann stirbt und dann wieder geboren wird. Sie haben ein angeborenes Gespür für den zyklischen Prozess. Die Dinge verändern sich ständig, werden besser und besser durch den zyklischen Prozess der Reifung. Ihre Energie ist Teil dieses Prozesses, daher ist es sehr wahrscheinlich, dass auch Ihre Ausbildung und Ihre Karriere zyklisch verlaufen werden. Es ist unwahrscheinlich, dass Sie 25 Jahre lang im selben Job bleiben, es sei denn, dieser Job kann sich mit der Zeit weiterentwickeln und verändern. Sie sind hier, um den Reifungsprozess zu meistern.",
    },
  },
  55: {
    rechts: {
      name: "Rechtswinkliges Kreuz des schlafenden Phönix",
      tore: [55, 59, 34, 20],
      quelle: "Der schlafende Phönix erhebt sich aus der Asche. Die Energie Ihres Kreuzes wird durch die Energie, die direkt aus dem Sakralbereich in die Kehle fliesst, vorangetrieben. Diese Energie kann sehr produktiv sein. In Ihrem Kreuz befindet sich jedoch auch eine Energie, die launisch ist und zwischen dem halbvollen und dem halbleeren Glas schwankt. Ihre Herausforderung besteht darin, auf dieser Welle zu reiten und auf dem Weg Trost in den halbvollen Gläsern zu finden. Sie lernen viel über den Prozess und die Qualität von Emotionen und haben die Gabe, dies anderen zu vermitteln.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Stimmungen",
      tore: [55, 59, 9, 16],
      quelle: "Ihr Kreuz trägt die Energie, die Dinge in grosser Tiefe und im Detail wissen zu wollen. Wenn Sie die Launenhaftigkeit und besonders die melancholische Energie, die in Ihrer Konfiguration durchläuft, ausgleichen können, dann haben Sie das Talent, die Dinge auf eine grossartige Weise voranzubringen.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Geistes",
      tore: [55, 59, 9, 16],
      quelle: "Die Energie in Ihrem Kreuz beinhaltet das ursprüngliche Bedürfnis nach gutem Essen, Liebe und Intimität in Ihrem Leben. Die Erfüllung dieser Bedürfnisse ist der Treibstoff für Ihren Geist und sorgt dafür, dass Sie sich gut fühlen. Wenn Ihr Fundament gelegt ist, können Sie Ihren Geist aufsteigen lassen.",
    },
  },
  56: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Gesetzmässigkeiten 2",
      tore: [56, 60, 3, 50],
      quelle: "Sie sind hier, um über ideale Gesetze zu sprechen. Ihre Energie wird angetrieben, um Regeln und Vorschriften zu haben, und Sie werden darüber sprechen oder träumen, wie man sie schaffen kann. Sie sind hier, um Veränderungen durch Ihre Vision dessen, was möglich ist, zu fördern und auszudrücken, wie es mit Regeln strukturiert sein wird. Sie werden nicht motiviert sein, über die Details der Struktur zu sprechen, aber Sie werden inspiriert sein, den Traum zu teilen und wie er die Dinge besser machen wird.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Stimulation",
      tore: [56, 60, 27, 28],
      quelle: "Sie haben ein Bedürfnis nach Adrenalinstimulation. Sie sind vielleicht ein Nervenkitzel-Sucher und werden wahrscheinlich gerne von Ihren Heldentaten erzählen. Sie haben einen grossen Entwurf, ein X- Games-Teilnehmer, ein Wildwasser-Rafting-Führer oder ein Romanautor zu sein, der Thriller schreibt. Sie sind hier, um von Adrenalinstimulationen angetan zu sein und haben das Bedürfnis, die Geschichten Ihrer Abenteuer zu erzählen.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ablenkung",
      tore: [56, 60, 27, 28],
      quelle: "Sie haben die Fähigkeit, die Aufmerksamkeit der Menschen von dem abzulenken, was sie gerade tun oder denken. Dies ist ein grossartiges Kreuz für einen Komiker oder jemanden, der versucht, Menschen zu helfen, die sich verlaufen haben. Diese Energie kann manchmal ein wenig problematisch sein, weil sie unterbrechend wirkt und Sie vielleicht einige negative Reaktionen erhalten. Sie kann auch nach innen gerichtet sein und dazu führen, dass Sie sich von dem ablenken, was Sie gerade tun. Letztendlich ziehen Sie andere zu dem an, was Sie stimuliert. Verwenden Sie Ihren Human Design Typ und Ihre Strategie, wenn Sie ablenken, und Sie werden feststellen, dass dies willkommener und sogar erfolgreich ist.",
    },
  },
  57: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Durchdringung 3",
      tore: [57, 51, 53, 54],
      quelle: "Sie haben die einzigartige Fähigkeit, andere Menschen zu lesen und im Jetzt zu wissen, was für sie richtig oder falsch ist. Ihre Energie unterstützt es, intuitiv zu sein und sogar die Stimmen von Engeln oder Gott oder anderer Intelligenz, die nicht in Form ist, zu hören. Die meiste Zeit werden Sie eine augenblickliche Schwingung von richtig oder falsch wahrnehmen, wenn die intuitive Energie pulsiert und verblasst. Sie sind hier, um weise zu sein, was Sie im Moment für sich und andere tun sollten. Dieses Wissen kommt von einem Ort des intuitiven Wissens. Sie werden bei allem, was Sie tun, direkt auf den Punkt kommen und nicht dazu neigen, Details einzubeziehen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Intuition",
      tore: [57, 51, 62, 61],
      quelle: "Sie verfügen über eine intuitive Fähigkeit, die Sie aber absichtlich nicht oft zum Ausdruck bringen werden. Sie haben das Talent, andere zu lesen und zu wissen, was für sie richtig und falsch ist. Nutzen Sie Ihren Human Design Typ und Ihre Strategie, um Ihr Wissen selektiv zu äussern. Auf diese Weise werden Sie gehört, so dass Sie Ihre Gabe der Welt zur Verfügung stellen können.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Weckrufs 2",
      tore: [57, 51, 62, 61],
      quelle: "Sie tragen die Energie in sich, die Sie weise und intuitiv macht. Das ist eine Energie, die andere wollen und mit der Zeit nach Ihnen suchen werden. Du hast Wissen und Informationen, die ihnen helfen werden. Ähnlich wie der Beschwichtiger können Sie praktische Lösungen für die Probleme des Tages anbieten. Wenn Sie älter werden, werden Sie sich von Ihrer intuitiven Gabe leiten lassen, um Ihr Leben zu leben.",
    },
  },
  58: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Dienstes 4",
      tore: [58, 52, 18, 17],
      quelle: "Das Kreuz, das Sie bringen, ist eine interessante Mischung aus der Liebe zur Schönheit und zum Leben und der Energie, den logischen Prozess zu korrigieren. Diese Korrektur ist ein wichtiger Prozess in unserer Welt, denn sie hilft, Muster zum Besseren zu verändern und bringt uns voran, um Fortschritte zu machen. Der Aspekt, Schönheit im Leben zu finden, mag manche Menschen neidisch machen, da sie Zugang zu dieser Energie haben wollen, um sie für eine praktischere Korrektur zu nutzen. Ihr Antrieb ist, die Energie für weniger praktische Angelegenheiten und mehr ästhetische oder spirituelle Dinge zu nutzen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Lebendigkeit",
      tore: [58, 52, 48, 21],
      quelle: "Die Energie, die Sie mitbringen, ist für den Prozess der Logik unerlässlich. Im Human Design System ist die Logik hungrig nach Energie, und Sie haben sie. Aber die Natur Ihres Kreuzes will Kontrolle. Deshalb wird es Situationen geben, in denen Sie gebeten werden, einen Beitrag zu leisten, aber Sie werden dazu getrieben, nach Kontrolle zu fragen. Wenn Ihr Ziel ähnlich ist oder in die gleiche Richtung geht, werden Sie Harmonie in der Situation finden, aber wenn das nicht der Fall ist, dann wird die Beziehung im Zwiespalt sein. Ihre Gabe ist es, den logischen Prozess mit Energie zu versorgen und ihn zum gegenseitigen Nutzen aller Beteiligten zu kontrollieren.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ansprüche 2",
      tore: [58, 52, 48, 21],
      quelle: "Ihr Kreuz trägt Energie, die für andere Menschen nützlich ist, deshalb werden andere versuchen, sich mit Ihnen zu verbinden, um an diese Energie zu gelangen. Dieses Kreuz bietet auch Korrekturen an. Sie könnten feststellen, dass Sie andere entfremden, wenn Sie diese Korrektur anbieten, ohne gefragt zu werden. Manchmal fühlen Sie sich vielleicht ausgenutzt und glauben, dass jeder Ihnen Ihre Energie wegnimmt. Mit der Zeit bemühen Sie sich, ein Gleichgewicht zu finden, um sicherzugehen, dass Sie auch etwas von der Sache haben. In dieser Situation kommen Ihre Ansprüche ins Spiel. Sie werden sicherstellen wollen, dass das, was Sie zurückbekommen, eine faire Gegenleistung für die Energie ist, die Sie abgeben.",
    },
  },
  59: {
    rechts: {
      name: "Rechtswinkliges Kreuz des schlafenden Phönix 3",
      tore: [59, 55, 20, 34],
      quelle: "Angetrieben von den Energien in Ihrem Kreuz werden sexuelles Verlangen und intime Beziehungen in dieser Zeit eine grundlegende Rolle in Ihrer Erfahrung spielen. Wie der mythische Phönix durchlaufen diese Energien in Ihrem Leben die Phasen des Fliegens, des Aufsteigens, des Aufflammens, um zu Asche zu werden, nur um wieder aufzustehen. In Ihren frühen Jahren wird dies die Nähe zu Ihren Eltern und Geschwistern sein. In Ihrer sexuellen Blütezeit wird es mehr um Sex gehen und dann um die Gründung Ihrer eigenen Familie. In den mittleren und späteren Jahren werden Sie sich wieder mehr um die Pflege der Grossfamilie kümmern. Sie sind hier, um die Regeneration der menschlichen Spezies zu fördern.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Strategie",
      tore: [59, 55, 16, 9],
      quelle: "Die Energie Ihres Kreuzes bedeutet, dass Sie eine grossartige Strategie in Bezug auf Beziehungen haben. Sie könnten eine wunderbare Partnervermittlerin sein, da Sie sehen können, wo Menschen zusammenkommen. Die Menschen werden Ihnen auch freiwillig Informationen über ihre Interessen geben. Sie könnten Ihre eigene Partnervermittlung als Herausforderung empfinden, wenn jemand, an dem Sie interessiert sind, Ihnen gerade gesagt hat, dass er an einem anderen interessiert ist.",
    },
    links: {
      name: "Linkswinkliges Kreuz des Geistes 2",
      tore: [59, 55, 16, 9],
      quelle: "In der Energie Ihres Kreuzes geht es darum, Intimität und Romantik in einer Beziehung zu finden. Das kann von rein sexueller Motivation bis hin zur zärtlichen und bewegenden Romanze wie im Film \"Schlaflos in Seattle\" reichen. Ihr Kreuz wird angetrieben, um den Fokus auf die Lust und den Schmerz zu lenken, die eine Beziehung mit sich bringt. Da wir Menschen so sehr auf Beziehungen fokussiert sind, gibt es viele Wege, die Sie wählen können, um die Energie Ihres Kreuzes auszuleben.",
    },
  },
  60: {
    rechts: {
      name: "Rechtswinkliges Kreuz der Gesetzmässigkeiten 4",
      tore: [60, 56, 50, 3],
      quelle: "Ihr Kreuz hat die Energie und hält die Grenzen der Gesetze. Sie verstehen, dass Gesetze wichtig sind, weil sie die Ordnung aufrechterhalten und unsere Gesellschaft zusammenhalten. Ihre Energie ist an die traditionellen Gesetze oder die älteren Bräuche gebunden. Im Allgemeinen ist die Gesetzgebung ein evolutionärer Prozess. Regeln werden aufgestellt und im Laufe der Zeit, die manchmal Tausende von Jahren dauert, verändern sie sich. Wir können nicht einfach alle Gesetze aufgeben und neue wählen, denn es muss eine Beständigkeit geben. Sie haben die Energie, diese stabilisierende Kraft bereitzustellen und uns an die Regeln zu erinnern, die uns zusammenhalten.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Begrenzung",
      tore: [60, 56, 28, 27],
      quelle: "Ihr Kreuz hat die Energie, innerhalb der alten Gesetze oder Traditionen zu leben. Sie sind sehr festgelegt in der Art und Weise, wie Sie glauben, dass die Dinge getan werden sollten. Es gibt Regeln und sie haben einen grossen Zweck, um zu verhindern, dass die Dinge chaotisch werden. Sie fühlen sich mit neuen Regeln nicht wohl und neigen dazu, die alten zu bevorzugen. Sie sind hier, um dieses Erbe anzubieten, weil es ein Gleichgewicht zwischen Veränderung und Tradition gibt, das zu erhalten wichtig ist. Sie helfen, die Tradition zu bewahren.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Ablenkung 2",
      tore: [60, 56, 28, 27],
      quelle: "Die Energie des Kreuzes soll helfen, Veränderungen zu bremsen. Es gibt ein grosses Gleichgewicht zwischen Tradition und Veränderung. Beim Fortschritt geht es um Veränderung, aber wenn man ihn unkontrolliert lässt, würde reiner Fortschritt Chaos erzeugen. Du bist hier, um auf die Kontrolle und das Gleichgewicht zu bestehen und zu sagen: \"Hey, warum versuchst du, etwas zu ändern, was wir seit 200 Jahren auf die gleiche Weise machen. Das kann für diejenigen, die auf der Seite des Fortschritts stehen, störend sein, da sie einfach nur vorankommen wollen, aber Ihre Stimme ist wichtig, also lassen Sie sie hören.",
    },
  },
  61: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Maya 4",
      tore: [61, 62, 32, 42],
      quelle: "Sie tragen die Energie, das Unbekannte ins Wissen zu bringen. Das ist das neue und unentdeckte Wissen oder eine neue Art, die Dinge zu betrachten. Sie bringen ein inneres Wissen in die Welt und indem Sie es teilen, veranlassen Sie die Welt, ihre Position neu zu bewerten, um die neuen Ideen aufzunehmen.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Denkens",
      tore: [61, 62, 50, 3],
      quelle: "Ihr Kreuz hat die Energie, die das Wissen und das Denken über Dinge antreibt. Sie wollen verstehen, wie die Dinge funktionieren und sie vorantreiben. So wie wir uns entwickeln, entwickelt sich auch unser Verständnis von fast allem. Ihre Energie wird angetrieben, diesen Prozess zu bearbeiten und uns zu helfen, unser Verständnis auf eine neue Ebene zu entwickeln.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Obskuration 2",
      tore: [61, 62, 50, 3],
      quelle: "Sie tragen die Energie, Dinge in den Fokus zu bringen, indem Sie Aspekte identifizieren und ihnen einen Namen geben. Das können Objekte, Konzepte oder Lebensweisen sein. Sie sind hier, um den Dingen eine Grundlage zu geben, indem Sie sie benennen, damit sie vom Kollektiv diskutiert werden können. Dieses Kreuz wird angetrieben, um Dinge, Konzepte in den Fokus zu bringen, damit die logische Auswertung/Diskussion durchgeführt werden kann.",
    },
  },
  62: {
    rechts: {
      name: "Rechtswinkliges Kreuz von Maya 2",
      tore: [62, 61, 42, 32],
      quelle: "Sie haben die grosse Fähigkeit, kleine Details zu entdecken und sich zu merken. Diese Details werden in Ihrem Leben wichtig sein, und es wird Sie antreiben, sie mit anderen zu teilen. Denken Sie daran, dass diese vielleicht nicht immer alle quälenden Details hören wollen. Ihre Gabe kann sehr nützlich sein und einen grossen Beitrag zu einem Beruf oder einer Organisation leisten, die jemanden braucht, der sehr auf Details achtet.",
    },
    juxta: {
      name: "Juxtapositionskreuz des Details",
      tore: [62, 61, 3, 50],
      quelle: "Dieses Kreuz ist darauf ausgerichtet, durch die Einbeziehung von Details Bedeutung zu vermitteln. Es gibt hier ein wenig unscharfe Logik, da das Detail nicht immer präzise ist und die Art der Übermittlung die Bedeutung verschleiert. Das ist wie bei einem Geschichtenerzähler, der sich immer wieder unterbricht, um seltsame, detaillierte Fakten einzufügen und dabei den Schwung der Geschichte verliert. Sie sind hier, um in der Beziehung zu anderen einen Beitrag zu leisten, der fliesst und seine volle Wirkung entfaltet.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Obskuration",
      tore: [62, 61, 3, 50],
      quelle: "Die Energie Ihres Kreuzes ist hier, um Fragen zu stellen und Muster zu untersuchen, um ein tieferes Verständnis zu finden. Ist alles in Ordnung oder arbeitet es sich aus? Sie werden angetrieben, die Fragen zu stellen, die helfen, eine logische Perspektive zu finden, warum wir an einem bestimmten Ort sind. Die Fragen rufen nach den Antworten, die helfen, alles logisch zu ordnen.",
    },
  },
  63: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Bewusstseins",
      tore: [63, 64, 5, 35],
      quelle: "Die Energie des Kreuzes ist da, um Fragen zu stellen und Muster zu untersuchen, um ein tieferes Verständnis zu finden. Fragen wie: \"Ist alles in Ordnung mit der Sache oder regelt sich das von selbst? Sie werden dazu getrieben, die Fragen aus einer logischen Perspektive zu stellen, warum wir mit einem bestimmten Thema oder einer bestimmten Situation an einem bestimmten Ort sind. Ihre Fragen verlangen nach den Antworten, die uns helfen, die Sache logisch zu klären und Fortschritte zu machen.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Zweifel",
      tore: [63, 64, 26, 45],
      quelle: "Dieses Kreuz trägt die Energie des starken Zweifels am logischen Prozess. Ihr erster Instinkt ist, dass es nicht funktionieren wird. Sie sind hier in der Rolle des \"zweifelnden Thomas\". Aus diesem Zweifel heraus wird die Idee, das Produkt oder der Prozess analysiert, um sicherzustellen, dass es ohne unangemessenes Risiko funktioniert. Sie sind in gewisser Weise der Sicherheitsingenieur oder der Überseher der Gesellschaft.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Herrschaft",
      tore: [63, 64, 26, 45],
      quelle: "Sie haben die Energie, einzugreifen und Macht oder Autorität zu übernehmen. Dies ist ein transpersonaler Antrieb. Es ist Karma im Spiel, vielleicht persönlich oder um diejenigen zu schützen, die ausgenutzt werden. Die Ironie dabei ist, dass die Übernahme der Situation sie vielleicht besser macht, aber auch das Potenzial hat, sie noch schlimmer zu machen.",
    },
  },
  64: {
    rechts: {
      name: "Rechtswinkliges Kreuz des Bewusstseins 3",
      tore: [64, 63, 35, 5],
      quelle: "Diese Energie steht für die Fähigkeit, durch den Einsatz Ihrer geistigen Fähigkeiten Macht zu ergreifen. Sie sind hier, um Ihren mentalen Druck umzuwandeln, um Dinge herauszufinden und effektiv mit anderen zu kommunizieren und sie zu Mitläufern zu machen. Nicht jeder kann Ideen vorantreiben, um zu führen, aber Sie haben das energetische Design, dies zu tun.",
    },
    juxta: {
      name: "Juxtapositionskreuz der Verwirrung",
      tore: [64, 63, 45, 26],
      quelle: "Ihre Energie ist hier, um sich unserer Lebens- und Denkmuster bewusst zu sein. Sie haben die Energie, ein Erzähler oder Historiker zu sein. Es wird eine Tendenz geben, die Fakten zu manipulieren, wenn ein persönliches Interesse besteht. Das liegt daran, dass ein Teil der Kreuzenergie mit dem Ego verbunden ist und das Ego nach materiellem Gewinn zur Selbsterhaltung strebt. Hier kommt die Verwirrung an die Oberfläche, da die Fakten und die Realität nicht immer übereinstimmen. Eine objektive Position ist der beste Platz, um die Genauigkeit Ihrer Dokumentation oder Ihres Ausdrucks von Ereignissen zu bewahren.",
    },
    links: {
      name: "Linkswinkliges Kreuz der Herrschaft 2",
      tore: [64, 63, 45, 26],
      quelle: "Sie sind hier, um Macht oder Autorität über Situationen zu übernehmen. Um dies zu tun, werden Sie die Geschichte heranziehen und sie Ihrer Sichtweise anpassen, sie vielleicht sogar verzerren. Möglicherweise profitieren Sie von diesen Handlungen oder gewinnen dadurch. Dies ist ein karmisches Kreuz. Wenn Sie also eine autoritäre Position in Erwägung ziehen, müssen Sie das Ergebnis als Teil Ihres Entscheidungsprozesses abwägen.",
    },
  },
};


/** Profil ("4/6", "4-6", 46) -> Winkel. Unbekannt -> null. */
function winkelAusProfil(profil) {
  if (profil == null) return null;
  const s = String(profil).replace(/[^0-9]/g, '');
  if (s.length !== 2) return null;
  return PROFIL_WINKEL[`${s[0]}/${s[1]}`] || null;
}

/**
 * Kreuz aufloesen.
 * @param {object} o
 * @param {number} o.sonneTorPersoenlichkeit  Tor der Persoenlichkeits-Sonne (1-64)
 * @param {string|number} [o.profil]          z.B. "4/6"
 * @param {string} [o.winkel]                 alternativ direkt rechts|juxta|links
 * @returns {object|null} { tor, winkel, name, tore, quelle, torNamen, winkelLabel }
 */
function getInkarnationskreuz({ sonneTorPersoenlichkeit, profil, winkel } = {}) {
  const tor = Number(sonneTorPersoenlichkeit);
  const w = winkel || winkelAusProfil(profil);
  if (!Number.isInteger(tor) || tor < 1 || tor > 64 || !w) return null;
  const eintrag = KREUZE[tor] && KREUZE[tor][w];
  if (!eintrag) return null;
  return {
    tor,
    winkel: w,
    name: eintrag.name,
    tore: eintrag.tore,
    quelle: eintrag.quelle,
    torNamen: eintrag.tore.map((t) => `${t} ${TOR_NAMEN[t]}`),
    winkelLabel: WINKEL_LABEL[w],
  };
}

/**
 * Prompt-Baustein: liefert das Kreuz als Deutungsmaterial, nicht als Ausgabetext.
 * Die Rohfassung bleibt deutsch; die Ausgabesprache steuert nur die Instruktion.
 */
function kreuzPromptBlock(kreuz, sprache = 'de') {
  if (!kreuz) return '';
  const [sP, eP, sD, eD] = kreuz.tore;
  const kopf = [
    `INKARNATIONSKREUZ: ${kreuz.name}`,
    `Winkel: ${kreuz.winkelLabel.de} (${WINKEL_KURZ[kreuz.winkel].de})`,
    `Tore: Sonne Persoenlichkeit ${sP} ${TOR_NAMEN[sP]} · Erde Persoenlichkeit ${eP} ${TOR_NAMEN[eP]} · ` +
      `Sonne Design ${sD} ${TOR_NAMEN[sD]} · Erde Design ${eD} ${TOR_NAMEN[eD]}`,
    'Deutungsmaterial (deutsche Rohfassung, nicht woertlich uebernehmen):',
    kreuz.quelle,
  ].join('\n');

  const instr = {
    de: 'Formuliere daraus einen eigenstaendigen Abschnitt in Susanas Stimme: warm, konkret, ' +
        'in der Du-Form, ohne Fachjargon-Haeufung. Keine Saetze aus der Rohfassung uebernehmen. ' +
        'Verknuepfe das Kreuz mit Typ, Autoritaet und Profil der Person.',
    en: 'Write a standalone section in English from this material: warm, concrete, second person, ' +
        'no jargon pile-up. Do not reuse sentences from the German source. Connect the cross to the ' +
        "person's type, authority and profile.",
    pt: 'Escreve uma seccao autonoma em portugues a partir deste material: calorosa, concreta, na ' +
        'segunda pessoa, sem acumular jargao. Nao reutilizes frases da fonte alema. Liga a cruz ao ' +
        'tipo, a autoridade e ao perfil da pessoa.',
  };
  return `${kopf}\n\n${instr[sprache] || instr.de}`;
}

module.exports = {
  WINKEL, WINKEL_LABEL, WINKEL_KURZ, PROFIL_WINKEL, TOR_NAMEN, KREUZE,
  winkelAusProfil, getInkarnationskreuz, kreuzPromptBlock,
};
