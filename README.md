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


## Erweiterungen dieser Version
- Bereiche mit vielen Einträgen lassen sich auf- und zuklappen; der Zustand wird auf dem Gerät gespeichert.
- Jahresmomente werden als Übersicht mit zwölf Monaten angezeigt. Beim Öffnen eines Monats erscheinen dessen Ereignisse.
- Ereignisse aus dem Jahreskalender werden in der allgemeinen Suche berücksichtigt.
- Ein Home-Button ermöglicht die Rückkehr zum Seitenanfang.
