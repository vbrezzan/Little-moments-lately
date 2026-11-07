# Little Moments – PWA

Eine private Erinnerungs-App für Android und andere moderne Browser.

## Funktionen
- Tagebuch, Kindersprüche, Zitate, Meilensteine und Foto-Erinnerungen
- Einträge erstellen, bearbeiten und löschen
- Kinderzitate mit Zuordnung, wer den Spruch gesagt hat
- Habit Tracker für persönliche und familiäre Gewohnheiten
- Monatskalender mit Tagesstatus und Fortschritt je Gewohnheit
- Fotos werden beim Auswählen automatisch auf max. 1600 px und JPEG komprimiert
- Suche und Kategorie-Filter
- Lokale Speicherung im Browser (IndexedDB)
- Manuelles Backup als JSON-Datei und Wiederherstellung
- Installierbar als PWA und offline nach dem ersten Laden

## Wichtig
Die App hat **keine Cloud-Synchronisierung und keinen Login**. Die Daten bleiben im Browser-Speicher dieses Geräts. Bei Löschen der Browserdaten, Deinstallation/Zurücksetzen oder Verlust des Geräts können Daten verloren gehen. Regelmäßig ein Backup exportieren und an einem sicheren Ort ablegen.

## Veröffentlichung / Installation
Eine PWA benötigt eine HTTPS-Adresse (oder localhost), damit Service Worker und Installation funktionieren. Lade alle Dateien dieses Ordners auf einen HTTPS-Webhost. Für die Installation auf Android:
1. Die HTTPS-Adresse in Chrome öffnen.
2. Menü (⋮) öffnen.
3. „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.

## Backup
In der App „Backup erstellen“ wählen. Zum Wiederherstellen die JSON-Datei über „Backup wiederherstellen“ auswählen. Beim Import werden Einträge und Gewohnheiten mit gleicher ID ersetzt; andere bleiben erhalten. Das Backup enthält beides.

## Lokal testen
Mit einem lokalen Webserver aus diesem Ordner starten, z. B. `python -m http.server 8000`, dann `http://localhost:8000` öffnen.


## Update einer bereits installierten App
1. In Little Moments zuerst **Backup erstellen** und die JSON-Datei sicher aufbewahren.
2. Im bestehenden GitHub-Repository die Dateien aus diesem Paket hochladen und die vorhandenen Dateien ersetzen (keine neue Repository erstellen).
3. Die bestehende Website-Adresse erneut in Chrome öffnen und kurz warten, bis die neue Version geladen ist.
4. Die vorhandenen Erinnerungen bleiben im selben Browser-Speicher. Die Datenbank wird nur erweitert; die bisherigen Einträge werden nicht gelöscht.
5. Nach dem Update ein Backup erstellen, damit auch die neuen Gewohnheiten gesichert sind.

Hinweis: Die automatische Bildverkleinerung beginnt erst, nachdem Android ein Foto an die App übergeben hat. Wenn bereits der Android-Fotoauswähler selbst einfriert, kann das zusätzlich ein Problem der Galerie-/Dateiauswahl-App oder des Geräts sein.


## Monatsnotizen (Version 3)
Für Tiago, Luan und Lira gibt es pro Monat eine eigene freie Notizsammlung. Notizen können hinzugefügt, bearbeitet und gelöscht werden. Sie werden lokal in einem zusätzlichen IndexedDB-Store gespeichert und in Backups exportiert/importiert. Beim ersten Öffnen dieser Version wird die bestehende Datenbank automatisch von Version 2 auf Version 3 erweitert; vorhandene Erinnerungen und Gewohnheiten werden nicht absichtlich gelöscht.


Foto-Komprimierung (Version 6): Neue Fotos werden auf maximal 800 Pixel an der längsten Seite verkleinert und als JPEG mit 40 % Qualität gespeichert. Bereits gespeicherte Fotos werden nicht nachträglich verändert.


Speicheranzeige (Version 7): zeigt belegten Speicher, geschätzten freien Speicher (Browser-Limit minus Belegung) und das geschätzte Gesamtlimit. Die Werte sind Näherungen des Browsers und keine garantierte Speicherzusage.


## Version 8

- Habit Tracker: past dates can be selected in the calendar and checked retroactively. Future dates cannot be marked.
- Favorites collection for books, films, series and other favorites, with creator, year, rating, status and notes.
- Yearly memories: 12-month calendar, marked dates, date-range events (e.g. multi-week holidays), categories, people and descriptions. Previous years remain accessible; a new year is available automatically through year navigation.
- Backup format version 5 includes entries, habits, monthly notes, favorites and yearly events. Import remains additive and skips IDs already present.
- IndexedDB schema upgraded to version 4 without deleting existing stores or data.
- Service worker cache bumped to little-moments-v9.

To update, replace all seven files in the existing GitHub Pages repository and commit. Existing local data is preserved by the database upgrade. As always, create a backup before updating as a precaution.


## Habit Tracker – Monatsübersicht

Die Monatsübersicht zeigt für jede Gewohnheit die Anzahl der erledigten Tage im ausgewählten Monat sowie die markierten Kalendertage. Pro Gewohnheit und Datum wird weiterhin nur ein erledigter Tag gespeichert. Die bestehende IndexedDB-Datenbank (Version 4) und vorhandene Einträge bleiben unverändert.

## Exporte und globale Suche (Version 12)
- Neuer Bereich „Exporte“ mit Auswahl von Zitaten, Kindersprüchen, Meilensteinen, Tagebucheinträgen, Monatsnotizen und Jahresmomenten.
- Filter nach Zeitraum und Person; Fotos können in die Druckansicht aufgenommen oder ausgeschlossen werden.
- Die Druckansicht kann über den Browser gedruckt oder als PDF gespeichert werden.
- Die globale Suche berücksichtigt jetzt Erinnerungen, Monatsnotizen, Jahresmomente, Favoriten und Gewohnheiten. Bei einer Suchanfrage wird der aktive Kategorie-Filter nicht auf andere Bereiche angewendet.
- IndexedDB bleibt auf Version 4; bestehende lokale Daten werden durch diese Erweiterung nicht migriert oder gelöscht.
- Service-Worker-Cache auf little-moments-v12 aktualisiert.


## Version 14 – Tagebuch, Sprachaufnahmen und Sammlungsfilter
- Tagebuch-Kalender mit Markierung vorhandener Einträge und Filter nach ausgewähltem Tag.
- Kindersprüche können eine lokale Audiodatei (bis 15 MB) enthalten. Aufnahmen lassen sich in der App abspielen; es gibt keine Transkription und keine externe Übertragung.
- Audioaufnahmen sind Bestandteil der Einträge und werden deshalb auch in JSON-Backups aufgenommen. Backups mit vielen oder großen Audiodateien können entsprechend größer werden.
- Lieblingssammlung kann nach Kategorie, Status und Jahr gefiltert werden.
- IndexedDB bleibt auf Version 4; vorhandene Daten werden nicht gelöscht oder migriert.
- Service-Worker-Cache auf little-moments-v14 aktualisiert.


## Version 16 – Audio, Import und Tagebuch-Vollansicht
- Sprachaufnahmen können bei allen Erinnerungskategorien und bei Monatsnotizen angehängt werden. Sie werden lokal gespeichert, abgespielt und in JSON-Backups übernommen. Keine Transkription.
- Importbereich für Bilder/Screenshots (OCR), PDFs, DOCX, TXT und Markdown. OCR benötigt beim ersten Einsatz eine Internetverbindung zum Laden der Bibliotheken/Sprachdaten; Dateien werden im Browser verarbeitet und nicht an einen KI-Dienst gesendet.
- Lange Tagebucheinträge können über „Eintrag in Vollansicht lesen“ in einer ruhigen, lesefreundlichen Ansicht geöffnet werden.
- IndexedDB bleibt auf Version 4; vorhandene Daten werden nicht gelöscht oder migriert. Service-Worker-Cache auf little-moments-v16 aktualisiert.
- Audiodateien sind auf 15 MB pro Datei begrenzt. Große Medien können Backups und Gerätespeicher deutlich vergrößern.


Version 16: Breite Karte „Alle Erinnerungen“ direkt unter „Moment festhalten“; direkte Monats- und Jahresauswahl für Erinnerungen, Tagebuch, Habit Tracker, Monatsnotizen und Jahresmomente.
