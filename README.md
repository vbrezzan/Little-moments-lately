# Little Moments – PWA

Eine private Erinnerungs-App für Android und andere moderne Browser.

## Funktionen
- Tagebuch, Kindersprüche, Zitate, Meilensteine und Foto-Erinnerungen
- Einträge erstellen, bearbeiten und löschen
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
In der App „Backup erstellen“ wählen. Zum Wiederherstellen die JSON-Datei über „Backup wiederherstellen“ auswählen. Beim Import werden Einträge mit gleicher ID ersetzt; andere Einträge bleiben erhalten.

## Lokal testen
Mit einem lokalen Webserver aus diesem Ordner starten, z. B. `python -m http.server 8000`, dann `http://localhost:8000` öffnen.
