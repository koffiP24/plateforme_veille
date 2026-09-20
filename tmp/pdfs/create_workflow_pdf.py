from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, Flowable, ListFlowable, ListItem,
    NextPageTemplate
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(r"C:\INFORMATIQUE\ENVAL\Memoire\plateforme-veille")
OUT = ROOT / "output" / "pdf" / "workflow-complet-plateforme-veille-iso-17025.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = HexColor("#0F172A")
NAVY_2 = HexColor("#172554")
GREEN = HexColor("#10B981")
GREEN_DARK = HexColor("#047857")
MINT = HexColor("#D1FAE5")
SKY = HexColor("#E0F2FE")
SLATE = HexColor("#475569")
LIGHT = HexColor("#F1F5F9")
MID = HexColor("#CBD5E1")
WHITE = colors.white
RED = HexColor("#DC2626")
AMBER = HexColor("#D97706")


def register_fonts():
    regular = Path(r"C:\Windows\Fonts\arial.ttf")
    bold = Path(r"C:\Windows\Fonts\arialbd.ttf")
    italic = Path(r"C:\Windows\Fonts\ariali.ttf")
    if regular.exists():
        pdfmetrics.registerFont(TTFont("AppRegular", str(regular)))
        pdfmetrics.registerFont(TTFont("AppBold", str(bold)))
        pdfmetrics.registerFont(TTFont("AppItalic", str(italic)))
    else:
        pdfmetrics.registerFont(TTFont("AppRegular", "DejaVuSans.ttf"))
        pdfmetrics.registerFont(TTFont("AppBold", "DejaVuSans-Bold.ttf"))
        pdfmetrics.registerFont(TTFont("AppItalic", "DejaVuSans-Oblique.ttf"))


register_fonts()


class NumberedDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        self.section_number = 0

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            text = flowable.getPlainText()
            if style == "H1":
                self.canv.bookmarkPage(text)
                self.canv.addOutlineEntry(text, text, level=0, closed=False)
                self.notify("TOCEntry", (0, text, self.page))
            elif style == "H2":
                key = f"{text}-{self.page}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(text, key, level=1, closed=False)


class WorkflowDiagram(Flowable):
    def __init__(self, width=16.8 * cm, height=8.5 * cm):
        super().__init__()
        self.width = width
        self.height = height

    def draw_box(self, c, x, y, w, h, title, subtitle="", fill=WHITE, stroke=MID):
        c.setFillColor(fill)
        c.setStrokeColor(stroke)
        c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("AppBold", 8.3)
        c.drawCentredString(x + w / 2, y + h - 13, title)
        if subtitle:
            c.setFillColor(SLATE)
            c.setFont("AppRegular", 6.8)
            c.drawCentredString(x + w / 2, y + 8, subtitle)

    def arrow(self, c, x1, y1, x2, y2):
        c.setStrokeColor(GREEN_DARK)
        c.setFillColor(GREEN_DARK)
        c.setLineWidth(1.2)
        c.line(x1, y1, x2, y2)
        if x2 >= x1:
            pts = [(x2, y2), (x2 - 5, y2 + 3), (x2 - 5, y2 - 3)]
        else:
            pts = [(x2, y2), (x2 + 5, y2 + 3), (x2 + 5, y2 - 3)]
        p = c.beginPath()
        p.moveTo(*pts[0]); p.lineTo(*pts[1]); p.lineTo(*pts[2]); p.close()
        c.drawPath(p, fill=1, stroke=0)

    def draw(self):
        c = self.canv
        w, h, gap = 3.15 * cm, 1.35 * cm, 0.22 * cm
        x0, y_top = 0.15 * cm, 6.65 * cm
        labels1 = [
            ("1. Configurer", "utilisateurs et taxonomie"),
            ("2. Connecter", "sources et connecteurs"),
            ("3. Collecter", "manuel ou planifié"),
            ("4. Normaliser", "format commun"),
            ("5. Dédupliquer", "DOI, URL, empreinte"),
        ]
        for i, (title, sub) in enumerate(labels1):
            x = x0 + i * (w + gap)
            self.draw_box(c, x, y_top, w, h, title, sub, MINT if i in (0, 4) else LIGHT)
            if i < len(labels1) - 1:
                self.arrow(c, x + w, y_top + h / 2, x + w + gap - 3, y_top + h / 2)

        labels2 = [
            ("10. Piloter", "dashboard et audit"),
            ("9. Diffuser", "notifications et rapports"),
            ("8. Publier", "rendre consultable"),
            ("7. Valider", "accepter ou rejeter"),
            ("6. Qualifier", "type, criticité, thèmes"),
        ]
        y2 = 3.8 * cm
        for i, (title, sub) in enumerate(labels2):
            x = x0 + i * (w + gap)
            self.draw_box(c, x, y2, w, h, title, sub, SKY if i in (0, 1) else LIGHT)
            if i < len(labels2) - 1:
                self.arrow(c, x + w + gap - 3, y2 + h / 2, x + w, y2 + h / 2)
        self.arrow(c, x0 + 4 * (w + gap) + w / 2, y_top, x0 + 4 * (w + gap) + w / 2, y2 + h)

        c.setFillColor(SLATE)
        c.setFont("AppItalic", 7.5)
        c.drawCentredString(self.width / 2, 1.65 * cm,
                           "Les protections de rôles, l’historique et l’audit accompagnent tout le parcours.")


class LifecycleDiagram(Flowable):
    def __init__(self, width=16.5 * cm, height=4.2 * cm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        names = ["NOUVEAU", "À QUALIFIER", "VALIDÉ", "PUBLIÉ", "ARCHIVÉ"]
        fills = [SKY, LIGHT, MINT, HexColor("#A7F3D0"), MID]
        w, h, gap = 2.75 * cm, 1.0 * cm, 0.45 * cm
        y = 2.15 * cm
        x0 = 0.25 * cm
        centers = []
        for i, name in enumerate(names):
            x = x0 + i * (w + gap)
            centers.append((x + w / 2, y + h / 2))
            c.setFillColor(fills[i]); c.setStrokeColor(GREEN_DARK)
            c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
            c.setFillColor(NAVY); c.setFont("AppBold", 8)
            c.drawCentredString(x + w / 2, y + h / 2 - 3, name)
            if i < len(names) - 1:
                c.setStrokeColor(GREEN_DARK); c.setFillColor(GREEN_DARK)
                c.line(x + w, y + h / 2, x + w + gap - 5, y + h / 2)
                p = c.beginPath(); p.moveTo(x + w + gap - 5, y + h / 2)
                p.lineTo(x + w + gap - 10, y + h / 2 + 3); p.lineTo(x + w + gap - 10, y + h / 2 - 3); p.close()
                c.drawPath(p, fill=1, stroke=0)
        xq, yq = centers[1]
        c.setStrokeColor(RED); c.setFillColor(RED)
        c.line(xq, y, xq, 0.95 * cm)
        p = c.beginPath(); p.moveTo(xq, 0.95 * cm); p.lineTo(xq - 3, 1.1 * cm); p.lineTo(xq + 3, 1.1 * cm); p.close()
        c.drawPath(p, fill=1, stroke=0)
        c.setFillColor(HexColor("#FEE2E2")); c.setStrokeColor(RED)
        c.roundRect(xq - 1.35 * cm, 0.05 * cm, 2.7 * cm, 0.75 * cm, 6, fill=1, stroke=1)
        c.setFillColor(RED); c.setFont("AppBold", 8)
        c.drawCentredString(xq, 0.31 * cm, "REJETÉ")


def page_chrome(canvas, doc):
    page = canvas.getPageNumber()
    canvas.saveState()
    if page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setFillColor(GREEN)
        canvas.rect(0, A4[1] - 0.45 * cm, A4[0], 0.45 * cm, fill=1, stroke=0)
    else:
        canvas.setFillColor(NAVY)
        canvas.rect(0, A4[1] - 1.25 * cm, A4[0], 1.25 * cm, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont("AppBold", 8.5)
        canvas.drawString(2 * cm, A4[1] - 0.78 * cm, "PLATEFORME DE VEILLE ISO/IEC 17025")
        canvas.setFillColor(GREEN)
        canvas.rect(0, A4[1] - 1.32 * cm, A4[0], 0.07 * cm, fill=1, stroke=0)
        canvas.setStrokeColor(MID)
        canvas.line(2 * cm, 1.35 * cm, A4[0] - 2 * cm, 1.35 * cm)
        canvas.setFillColor(SLATE)
        canvas.setFont("AppRegular", 7.5)
        canvas.drawString(2 * cm, 0.88 * cm, "Workflow fonctionnel complet")
        canvas.drawRightString(A4[0] - 2 * cm, 0.88 * cm, f"Page {page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", fontName="AppBold", fontSize=10, leading=13,
                          textColor=GREEN, spaceAfter=12, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CoverTitle", fontName="AppBold", fontSize=27, leading=33,
                          textColor=WHITE, alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle(name="CoverSub", fontName="AppRegular", fontSize=13, leading=19,
                          textColor=HexColor("#CBD5E1"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1", fontName="AppBold", fontSize=18, leading=23,
                          textColor=NAVY, spaceBefore=4, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle(name="H2", fontName="AppBold", fontSize=12.5, leading=16,
                          textColor=GREEN_DARK, spaceBefore=9, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name="Body", fontName="AppRegular", fontSize=9.3, leading=14,
                          textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="BodySmall", fontName="AppRegular", fontSize=8.2, leading=11.5,
                          textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle(name="Caption", fontName="AppItalic", fontSize=7.5, leading=10,
                          textColor=SLATE, alignment=TA_CENTER, spaceBefore=4, spaceAfter=8))
styles.add(ParagraphStyle(name="Callout", fontName="AppRegular", fontSize=9, leading=13,
                          textColor=NAVY, leftIndent=8, rightIndent=8, spaceAfter=3))
styles.add(ParagraphStyle(name="TableHead", fontName="AppBold", fontSize=8.2, leading=10,
                          textColor=WHITE, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="TableCell", fontName="AppRegular", fontSize=7.8, leading=10,
                          textColor=NAVY))
styles.add(ParagraphStyle(name="TOCHeading", fontName="AppBold", fontSize=20, leading=24,
                          textColor=NAVY, spaceAfter=14))


def P(text, style="Body"):
    return Paragraph(text, styles[style])


def bullet_list(items, level=0):
    return ListFlowable(
        [ListItem(P(item, "Body"), leftIndent=12) for item in items],
        bulletType="bullet", start="circle", leftIndent=18 + level * 10,
        bulletFontName="AppRegular", bulletFontSize=6, bulletColor=GREEN_DARK,
        spaceAfter=7,
    )


def table(headers, rows, widths=None):
    data = [[P(h, "TableHead") for h in headers]]
    for row in rows:
        data.append([P(str(cell), "TableCell") for cell in row])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.35, MID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def callout(title, body, color=MINT):
    content = Table([[P(title, "H2")], [P(body, "Callout")]], colWidths=[16.5 * cm])
    content.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 0.8, GREEN_DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return content


story = []

# Cover
story += [Spacer(1, 4.2 * cm), P("DOCUMENTATION FONCTIONNELLE", "CoverKicker"),
          P("Workflow complet de la plateforme de veille", "CoverTitle"),
          P("Application de veille réglementaire, normative et scientifique<br/>pour un laboratoire ISO/IEC 17025", "CoverSub"),
          Spacer(1, 2.3 * cm)]
cover_box = Table([
    [P("Périmètre", "TableHead"), P("Modules 1 à 8", "TableHead")],
    [P("Contenu", "TableCell"), P("Collecte, qualification, validation, diffusion, suivi, rapports, audit et pilotage", "TableCell")],
    [P("Public", "TableCell"), P("Administrateur, responsable de veille, opérateur, référent laboratoire et lecteur", "TableCell")],
    [P("Version", "TableCell"), P("État fonctionnel actuel du projet", "TableCell")],
], colWidths=[4 * cm, 11.5 * cm])
cover_box.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
    ("BACKGROUND", (0, 1), (-1, -1), HexColor("#F8FAFC")),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#64748B")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 9),
    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story += [cover_box, Spacer(1, 2.6 * cm), P("Plateforme de veille ISO/IEC 17025", "CoverSub"),
          NextPageTemplate("normal"), PageBreak()]

# TOC
story += [P("Sommaire", "TOCHeading")]
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name="TOC1", fontName="AppBold", fontSize=10, leading=15,
                   leftIndent=0, firstLineIndent=0, textColor=NAVY, spaceBefore=4),
    ParagraphStyle(name="TOC2", fontName="AppRegular", fontSize=8.5, leading=12,
                   leftIndent=14, firstLineIndent=0, textColor=SLATE),
]
story += [toc, PageBreak()]

story += [P("1. Vue d’ensemble", "H1"),
          P("La plateforme transforme des informations externes en éléments de veille vérifiés, classés, publiés et suivis. Elle associe un traitement automatisé des données à des décisions humaines contrôlées par les rôles."),
          WorkflowDiagram(),
          P("Figure 1 - Chaîne fonctionnelle générale de l’application.", "Caption"),
          callout("Principe directeur", "L’automatisation récupère, normalise et rapproche les données. Les utilisateurs qualifient, valident et décident de leur publication. Le backend protège chaque opération et conserve les traces utiles."),
          P("Architecture fonctionnelle", "H2"),
          table(["Couche", "Responsabilité"], [
              ["Interface Vue / PrimeVue", "Présente les écrans, adapte les menus au rôle, affiche les messages et transmet les actions de l’utilisateur."],
              ["API NestJS", "Authentifie les requêtes, applique les rôles, valide les données et exécute les règles métier."],
              ["TypeORM et PostgreSQL", "Enregistrent les utilisateurs, sources, veilles, versions, décisions, actions, abonnements, rapports et audits."],
              ["Connecteurs externes", "Interrogent les flux RSS/Atom, Crossref et les imports manuels."],
              ["Événements et planification", "Déclenchent les collectes périodiques et les notifications après publication."],
          ], [4.2 * cm, 12.3 * cm]), PageBreak()]

story += [P("2. Authentification et rôles", "H1"),
          P("L’utilisateur saisit son adresse électronique et son mot de passe. Le backend recherche son compte, vérifie qu’il est actif, compare le mot de passe chiffré et génère un jeton JWT contenant son identifiant, son adresse et ses rôles."),
          P("Contrôles effectués", "H2"),
          bullet_list([
              "Le compte doit exister dans la base de données.",
              "Le statut doit être <b>ACTIVE</b>.",
              "Le mot de passe doit correspondre au condensat sécurisé enregistré.",
              "Le jeton doit être transmis pour chaque route protégée.",
              "Le backend recharge l’utilisateur afin qu’un compte désactivé ne puisse plus continuer à utiliser un ancien jeton.",
          ]),
          table(["Rôle", "Mission dans le workflow"], [
              ["Administrateur", "Configure la plateforme, gère les utilisateurs, les rôles, la taxonomie, les sources, les connecteurs et le pilotage."],
              ["Responsable de veille", "Supervise les collectes, qualifie si nécessaire, valide, rejette, publie et pilote les actions."],
              ["Opérateur de veille", "Lance les collectes, examine les nouveaux éléments et réalise leur qualification."],
              ["Référent laboratoire", "Suit les éléments utiles à son laboratoire et traite les actions qui lui sont attribuées."],
              ["Lecteur", "Consulte les informations publiées, utilise les favoris, les recherches et les abonnements."],
          ], [4.4 * cm, 12.1 * cm]),
          Spacer(1, 8),
          callout("Sécurité à deux niveaux", "Le frontend masque les commandes inutiles pour rendre l’interface claire. Les Guards NestJS restent la protection réelle, car une requête peut être envoyée directement à l’API.", SKY), PageBreak()]

story += [P("3. Administration et taxonomie", "H1"),
          P("L’administrateur prépare le cadre dans lequel la veille sera exploitée. Cette étape précède la collecte et garantit des données cohérentes."),
          P("Gestion des utilisateurs", "H2"),
          bullet_list([
              "Créer un compte avec une identité, une adresse électronique et un mot de passe.",
              "Attribuer un ou plusieurs rôles.",
              "Ajouter ou retirer un rôle lorsque les responsabilités évoluent.",
              "Désactiver ou réactiver un compte sans supprimer son historique.",
              "Empêcher un administrateur de se désactiver ou de retirer son propre rôle administrateur.",
          ]),
          P("Cycle d’un compte", "H2"),
          table(["Étape", "Statut", "Effet"], [
              ["Création", "ACTIVE", "Le compte peut se connecter et utiliser les fonctions autorisées."],
              ["Désactivation", "INACTIVE", "Le compte reste enregistré, mais toute nouvelle connexion est refusée."],
              ["Réactivation", "ACTIVE", "L’accès est de nouveau accordé selon les rôles conservés ou modifiés."],
          ], [3.2 * cm, 3.1 * cm, 10.2 * cm]),
          P("Taxonomie", "H2"),
          P("La taxonomie fournit le vocabulaire commun utilisé pendant la qualification et les abonnements. Elle contient les thèmes, domaines, laboratoires, mots-clés et synonymes. Les consultations sont ouvertes aux utilisateurs authentifiés, tandis que les modifications sont réservées à l’administrateur."), PageBreak()]

story += [P("4. Sources et connecteurs", "H1"),
          P("Une source représente l’origine de l’information. Elle décrit l’organisme, le pays, la catégorie, le type technique, l’adresse principale, la fréquence et son état actif."),
          table(["Type de connecteur", "Configuration attendue", "Utilisation"], [
              ["Import manuel", "Aucune adresse obligatoire", "Saisie ou dépôt réalisé par un utilisateur."],
              ["RSS / Atom", "Adresse du flux <b>feedUrl</b>", "Lecture automatisée d’un flux de publications."],
              ["API Crossref", "Fournisseur, baseUrl, requête, nombre de résultats et contact", "Recherche de publications scientifiques avec DOI."],
          ], [3.5 * cm, 6.3 * cm, 6.7 * cm]),
          P("Test du connecteur", "H2"),
          P("Avant la première collecte, le test vérifie que la configuration est exploitable. Le connecteur passe ensuite dans un état technique affiché en français dans l’interface."),
          table(["État interne", "Affichage", "Conséquence"], [
              ["NOT_TESTED", "Non testé", "Le connecteur n’a pas encore été vérifié."],
              ["AVAILABLE", "Disponible", "Le connecteur est prêt à collecter."],
              ["RUNNING", "En cours", "Une collecte est en cours d’exécution."],
              ["ERROR", "En erreur", "Une intervention ou une nouvelle tentative est nécessaire."],
          ], [4 * cm, 4 * cm, 8.5 * cm]),
          Spacer(1, 8),
          callout("Désactivation plutôt que suppression", "Une source inactive ne participe plus aux collectes planifiées. Elle reste conservée afin de préserver ses veilles, versions, actions et traces d’audit."), PageBreak()]

story += [P("5. Collecte manuelle et planifiée", "H1"),
          P("Une collecte manuelle est déclenchée depuis la page Sources. Une collecte automatique est déclenchée par le planificateur lorsque la fréquence de la source est arrivée à échéance."),
          P("Fréquences", "H2"),
          table(["Exemple", "Interprétation"], [
              ["30m", "Une collecte toutes les trente minutes."],
              ["6h", "Une collecte toutes les six heures."],
              ["1j", "Une collecte quotidienne."],
          ], [4 * cm, 12.5 * cm]),
          P("Protection contre les clics multiples", "H2"),
          P("Le système évite deux traitements simultanés du même connecteur. Il combine une liste interne des collectes en cours et un verrou PostgreSQL. Le bouton est également désactivé pendant l’exécution afin de rendre l’état visible à l’utilisateur."),
          P("Suivi de l’exécution", "H2"),
          table(["Compteur", "Signification"], [
              ["Reçus", "Nombre total d’éléments renvoyés par la source."],
              ["Nouveaux", "Éléments absents de la base et créés pendant cette collecte."],
              ["Mis à jour", "Éléments déjà connus dont le contenu a changé."],
              ["Doublons", "Éléments déjà connus et identiques."],
              ["Erreurs", "Éléments que le pipeline n’a pas pu traiter."],
          ], [4.2 * cm, 12.3 * cm]),
          P("L’exécution se termine avec l’état Terminée, Terminée avec erreurs ou Erreur. L’historique récent alimente le diagnostic et les tableaux de bord."), PageBreak()]

story += [P("6. Normalisation, doublons et versions", "H1"),
          P("Le flux RSS et l’API Crossref ne renvoient pas les mêmes champs. Le service de normalisation convertit chaque résultat vers une structure commune : identifiant externe, DOI, titre, résumé, URL, langue, dates, type de veille, données brutes et empreinte."),
          P("Décision de déduplication", "H2"),
          table(["Situation", "Résultat", "Traitement"], [
              ["Aucune correspondance", "Créé", "Création d’un élément de veille et de sa première version."],
              ["Correspondance et même empreinte", "Doublon", "Aucun nouvel élément ; la collecte comptabilise le doublon."],
              ["Correspondance et contenu modifié", "Mis à jour", "Mise à jour de l’élément et conservation d’une nouvelle version."],
          ], [5.1 * cm, 3.1 * cm, 8.3 * cm]),
          P("Les correspondances utilisent notamment le DOI, l’identifiant externe, l’adresse canonique et l’empreinte. Une collecte indiquant “10 reçus, 10 doublons” signifie donc que les dix documents étaient déjà connus et inchangés."),
          callout("Valeur de l’historique", "Les versions permettent de prouver qu’une publication externe a changé et de conserver l’état antérieur, ce qui renforce la traçabilité attendue dans un contexte qualité.", SKY), PageBreak()]

story += [P("7. Consultation, recherche et favoris", "H1"),
          P("La page Veilles rassemble les éléments collectés. La recherche se met à jour pendant la saisie et peut être combinée avec plusieurs filtres."),
          bullet_list([
              "Recherche dans le titre et le résumé.",
              "Filtrage par statut, criticité, type de veille, source, domaine ou laboratoire.",
              "Tri par date, criticité ou autre champ autorisé.",
              "Pagination avec 10, 20 ou 50 résultats par page.",
              "Filtre personnel Mes favoris.",
              "Enregistrement et réapplication d’une vue de recherche.",
          ]),
          P("Visibilité selon le rôle", "H2"),
          P("Un lecteur ne reçoit que les éléments publiés. Les profils internes autorisés peuvent consulter les éléments en cours de qualification ou de validation. Cette restriction est appliquée par le backend en plus du contrôle des routes frontend."),
          P("Favoris et vues enregistrées", "H2"),
          P("Chaque favori et chaque vue enregistrée appartient à l’utilisateur connecté. Une vue mémorise les critères et le tri, par exemple : Réglementaire + Critique + Publié + date décroissante."), PageBreak()]

story += [P("8. Qualification", "H1"),
          P("La qualification transforme une information brute en information exploitable par le laboratoire. Elle est ouverte à l’administrateur, au responsable de veille et à l’opérateur de veille."),
          table(["Champ", "Rôle"], [
              ["Type de veille", "Classe l’information : scientifique, réglementaire, normative ou autre."],
              ["Pertinence", "Évalue l’intérêt de l’information sur une échelle de 0 à 100."],
              ["Criticité", "Indique le niveau faible, moyen, élevé ou critique."],
              ["Thèmes et mots-clés", "Décrivent précisément le sujet de l’information."],
              ["Domaines et laboratoires", "Identifient les activités ou unités concernées."],
          ], [4.3 * cm, 12.2 * cm]),
          P("Le backend vérifie l’existence de tous les identifiants de taxonomie sélectionnés. L’enregistrement remplace proprement les anciennes associations, conserve la qualification et place l’élément au statut À qualifier."),
          P("Lorsqu’un utilisateur rouvre la fiche, les valeurs précédemment enregistrées sont rechargées. Après un enregistrement réussi dans le formulaire de saisie, les champs peuvent être vidés pour faciliter une nouvelle opération."), PageBreak()]

story += [P("9. Validation, publication et archivage", "H1"),
          P("Le responsable de veille ou l’administrateur examine les informations qualifiées. Il peut ajuster la pertinence et la criticité avant de prendre une décision."),
          LifecycleDiagram(),
          P("Figure 2 - Cycle de vie éditorial d’un élément de veille.", "Caption"),
          table(["Décision", "Condition", "Résultat"], [
              ["Valider", "L’élément est À qualifier", "Le statut devient Validé et une décision est historisée."],
              ["Rejeter", "L’élément est À qualifier", "Le statut devient Rejeté ; un commentaire est obligatoire."],
              ["Publier", "L’élément est Validé", "Le statut devient Publié et l’événement de diffusion est émis."],
              ["Archiver", "L’élément est Publié", "Le statut devient Archivé sans supprimer l’historique."],
          ], [3.2 * cm, 5.2 * cm, 8.1 * cm]),
          Spacer(1, 6),
          callout("Limite actuelle", "Le workflow ne définit pas encore de transition de correction permettant de renvoyer directement un élément rejeté vers la qualification.", HexColor("#FEF3C7")), PageBreak()]

story += [P("10. Actions de suivi", "H1"),
          P("Une action traduit une information de veille en travail concret. Elle peut être créée pour un élément À qualifier, Validé ou Publié par l’administrateur, le responsable de veille ou le référent laboratoire."),
          bullet_list([
              "Titre et description de l’action.",
              "Type d’action et impact attendu.",
              "Décision ou consigne associée.",
              "Responsable choisi parmi les utilisateurs actifs et assignables.",
              "Date d’échéance et statut d’avancement.",
          ]),
          table(["Statut interne", "Affichage", "Sens"], [
              ["OPEN", "Ouverte", "L’action est créée mais n’a pas encore commencé."],
              ["IN_PROGRESS", "En cours", "Le responsable traite l’action."],
              ["DONE", "Terminée", "Le travail demandé est achevé."],
              ["CANCELLED", "Annulée", "L’action n’est plus à réaliser."],
          ], [4 * cm, 4 * cm, 8.5 * cm]),
          P("L’administrateur et le responsable voient toutes les actions. Le référent voit principalement les actions qui lui sont attribuées et ne peut modifier que celles dont il est responsable."), PageBreak()]

story += [P("11. Abonnements et notifications", "H1"),
          P("Un utilisateur authentifié peut s’abonner à une source, un thème, un mot-clé ou un domaine. L’abonnement indique aussi un canal, par exemple notification dans l’application ou courrier électronique."),
          P("Déclenchement", "H2"),
          P("Après une publication réussie, le service de validation émet l’événement <b>watch-item.published</b>. Le service de notifications charge les relations de l’élément, recherche les abonnements actifs correspondants et crée une notification pour chaque utilisateur concerné."),
          table(["Cible", "Condition de correspondance"], [
              ["Source", "L’élément publié provient de la source suivie."],
              ["Thème", "L’élément est qualifié avec le thème suivi."],
              ["Mot-clé", "L’élément possède le mot-clé suivi."],
              ["Domaine", "L’élément est associé au domaine suivi."],
          ], [4 * cm, 12.5 * cm]),
          P("Le compteur du menu affiche les notifications non lues et se rafraîchit automatiquement. Une notification lue reste dans l’historique, avec sa date de lecture, mais peut être séparée ou masquée dans l’interface."),
          callout("Canal e-mail", "Le modèle prévoit le canal e-mail. L’envoi réel nécessite également un transport de messagerie configuré ; la création des notifications internes fonctionne indépendamment.", SKY), PageBreak()]

story += [P("12. Rapports", "H1"),
          P("L’administrateur et le responsable de veille peuvent produire des rapports à partir des éléments publiés dans une période donnée."),
          table(["Paramètre", "Choix disponibles"], [
              ["Périodicité", "Hebdomadaire, mensuelle ou personnalisée."],
              ["Période", "Date de début et date de fin clairement identifiées."],
              ["Format", "PDF, CSV ou XLSX."],
              ["Contenu", "Éléments publiés compris dans la période choisie."],
          ], [4.2 * cm, 12.3 * cm]),
          P("Après la génération, le fichier est enregistré dans le stockage des rapports et ses métadonnées sont ajoutées à la base. La liste est actualisée, puis l’utilisateur peut télécharger le fichier avec un nom explicite comprenant le type et la période."),
          P("Déroulement", "H2"),
          bullet_list([
              "L’utilisateur renseigne la périodicité, les dates et le format.",
              "Le backend sélectionne uniquement les éléments publiés dans la période.",
              "Le fichier est généré puis associé à une ligne de rapport.",
              "Le navigateur propose l’emplacement d’enregistrement selon sa configuration.",
              "La page recharge la liste afin d’afficher immédiatement le nouveau rapport.",
          ]), PageBreak()]

story += [P("13. Audit et santé technique", "H1"),
          P("Le journal d’audit centralise les traces des opérations sensibles : utilisateurs, rôles, sources, actions, validation, publication et archivage."),
          table(["Information", "Utilité"], [
              ["Utilisateur", "Identifier la personne qui a réalisé l’opération."],
              ["Action", "Connaître la nature exacte de l’événement."],
              ["Entité et identifiant", "Retrouver la donnée concernée."],
              ["Avant / après", "Comparer l’ancien état avec le nouvel état."],
              ["Date et adresse IP éventuelle", "Reconstituer le contexte temporel et technique."],
          ], [4.8 * cm, 11.7 * cm]),
          P("Santé du système", "H2"),
          P("La page de santé vérifie que PostgreSQL répond, puis affiche la source, le statut et la dernière synchronisation de chaque connecteur. Un connecteur en erreur peut être relancé explicitement avec le bouton Réessayer."),
          callout("Objectif qualité", "L’audit explique ce qui s’est passé. La santé technique aide à détecter ce qui ne fonctionne plus. Les deux fonctions complètent le tableau de bord de pilotage."), PageBreak()]

story += [P("14. Tableau de bord selon le rôle", "H1"),
          P("Le tableau de bord présente uniquement les indicateurs utiles au profil connecté. Il évite de répéter les rôles et concentre l’attention sur les tâches à réaliser."),
          table(["Profil", "Indicateurs principaux"], [
              ["Administrateur", "Sources actives et inactives, utilisateurs actifs, éléments à valider, éléments critiques, actions ouvertes, erreurs et collectes récentes."],
              ["Responsable de veille", "Éléments à valider, critiques, validés et publiés, actions ouvertes et erreurs de collecte."],
              ["Opérateur de veille", "Sources actives, nouveaux éléments, éléments à qualifier, qualifications réalisées et dernières collectes."],
              ["Référent laboratoire", "Actions attribuées, actions en retard, éléments publiés et éléments critiques publiés."],
              ["Lecteur", "Éléments publiés, éléments critiques publiés, publications récentes, favoris et vues enregistrées."],
          ], [4.2 * cm, 12.3 * cm]),
          P("Les indicateurs proviennent directement de la base et respectent les règles de visibilité associées aux rôles. Le tableau de bord devient ainsi une vue de pilotage plutôt qu’un simple résumé de navigation."), PageBreak()]

story += [P("15. Scénario complet de bout en bout", "H1"),
          P("L’exemple suivant montre le parcours d’une information réglementaire depuis la configuration jusqu’au suivi."),
          table(["Étape", "Acteur", "Opération et résultat"], [
              ["1", "Administrateur", "Crée une source FDA, configure son flux RSS et teste le connecteur."],
              ["2", "Opérateur ou planificateur", "Déclenche la collecte lorsque la source est active et arrivée à échéance."],
              ["3", "Système", "Récupère les publications, les normalise et recherche les doublons."],
              ["4", "Système", "Crée les nouveaux éléments, ignore les doublons stricts et versionne les changements."],
              ["5", "Opérateur", "Ouvre un nouvel élément et renseigne type, pertinence, criticité et taxonomie."],
              ["6", "Responsable de veille", "Examine l’élément qualifié, puis le valide ou le rejette avec un commentaire."],
              ["7", "Responsable de veille", "Publie l’élément validé lorsque sa diffusion est justifiée."],
              ["8", "Système", "Recherche les abonnés concernés et crée leurs notifications."],
              ["9", "Lecteur", "Consulte l’information publiée, l’ajoute éventuellement à ses favoris et applique ses vues."],
              ["10", "Responsable ou référent", "Crée et traite une action de suivi si l’information exige une réponse."],
              ["11", "Responsable", "Génère un rapport périodique intégrant l’élément publié."],
              ["12", "Administrateur", "Contrôle les indicateurs, la santé des connecteurs et le journal d’audit."],
          ], [1.3 * cm, 4.2 * cm, 11 * cm]), PageBreak()]

story += [P("16. Synthèse des statuts", "H1"),
          table(["Objet", "Statuts principaux", "Lecture métier"], [
              ["Compte utilisateur", "ACTIVE, INACTIVE", "Compte autorisé ou interdit de connexion."],
              ["Connecteur", "NOT_TESTED, AVAILABLE, RUNNING, ERROR", "Non testé, disponible, en cours ou en erreur."],
              ["Collecte", "RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, ERROR", "En cours, terminée, terminée avec erreurs ou échouée."],
              ["Élément de veille", "NOUVEAU, A_QUALIFIER, VALIDE, REJETE, PUBLIE, ARCHIVE", "Cycle éditorial complet de l’information."],
              ["Action", "OPEN, IN_PROGRESS, DONE, CANCELLED", "Ouverte, en cours, terminée ou annulée."],
              ["Notification", "Non lue / lue", "Lue lorsque la date de lecture est renseignée."],
          ], [3.2 * cm, 6.2 * cm, 7.1 * cm]),
          Spacer(1, 10),
          callout("Résultat global", "La plateforme couvre la chaîne complète de veille : acquisition, fiabilisation, enrichissement, décision, diffusion, action, traçabilité et pilotage. Chaque rôle intervient à l’étape qui correspond à sa responsabilité."),
          Spacer(1, 18),
          P("Fin du document", "Caption")]


doc = NumberedDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm,
    topMargin=1.75 * cm, bottomMargin=1.65 * cm,
    title="Workflow complet de la plateforme de veille ISO/IEC 17025",
    author="Projet Plateforme de veille ISO/IEC 17025",
    subject="Documentation fonctionnelle détaillée",
)
frame_cover = Frame(2 * cm, 1.5 * cm, A4[0] - 4 * cm, A4[1] - 3 * cm, id="cover")
frame_normal = Frame(2 * cm, 1.55 * cm, A4[0] - 4 * cm, A4[1] - 3.1 * cm, id="normal")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame_cover], onPage=page_chrome),
    PageTemplate(id="normal", frames=[frame_normal], onPage=page_chrome),
])
doc.multiBuild(story)
print(OUT)
