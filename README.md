# GuessTheGame 🎮

Ein Pokédle-Style Ratespiel für Videospiel-Charaktere – gebaut nach dem Vorbild von
[AnimeGuess](https://ant1chr1s.github.io/animeguess/).

Kategorien: **Franchise, Spiel, Genre, Größe, Haarfarbe, Waffe, Spielbar/NPC**

Enthalten sind 188 Charaktere aus 42 Franchises, u. a. Final Fantasy, God of War,
Kingdom Hearts, Crash Bandicoot, Super Mario, The Legend of Zelda, Uncharted,
Tomb Raider, Clair Obscur: Expedition 33, Dark Souls, Elden Ring, Fortnite,
Resident Evil, Metal Gear Solid, Street Fighter, Mortal Kombat, Halo, The Witcher,
Horizon, Sekiro, Bloodborne, Persona, Devil May Cry, Overwatch, Minecraft,
Grand Theft Auto, Marvel's Spider-Man, Assassin's Creed, Cyberpunk 2077,
The Last of Us, Bayonetta, Sonic, Mega Man, Metroid, Diablo, Red Dead Redemption,
Cuphead, Hollow Knight, Celeste, Doom, League of Legends, Apex Legends u. v. m.

## Features
- 🎮 Endlos-Modus (zufälliger Charakter, Leaderboard mit Streaks)
- 📅 Täglicher Charakter (ein Charakter pro Tag für alle, mit Tages-Leaderboard)
- 🏆 Leaderboards (gespeichert über die GitHub Contents API, genau wie bei AnimeGuess)
- 🎮-Button: Übersicht über alle Spiele im Spiel mit Genre und Charakteranzahl
- 💡 Tipp-System (kostet einen Versuch, ab 10/20 Versuchen verfügbar)
- 📱 PWA (zum Homescreen hinzufügbar)

## ⚠️ GitHub Token (bereits eingetragen)

Für die Leaderboards ist bereits ein Fine-grained Personal Access Token (nur Schreibzugriff
auf dieses Repo) in `app.js` hinterlegt – genau wie im AnimeGuess-Projekt. Er liegt damit
clientseitig sichtbar im Code, ist aber bewusst auf **nur dieses Repo** beschränkt.

**Falls der Token abläuft oder du ihn erneuern willst:**
1. GitHub → **Settings → Developer settings → Fine-grained personal access tokens**
   → **Generate new token**
2. Repository access: nur **ant1chr1s/guessthegame** auswählen
3. Permissions: **Contents → Read and write**
4. Token generieren, kopieren und in `app.js` (Zeile mit `GITHUB_TOKEN`) einsetzen

Ohne gültigen Token läuft das Spiel normal weiter, nur die Leaderboards können nicht
geladen/gespeichert werden.

## GitHub Pages aktivieren

Settings → Pages → Branch: `main` / `/ (root)` → Save.
Die App ist danach unter `https://ant1chr1s.github.io/guessthegame/` erreichbar.

## Charaktere erweitern

Alle Charaktere stehen in `characters.js` als einfaches Array:

```js
{n:"Name",e:"🎮",fr:"Franchise",sp:"Spiel",g:"Genre",h:180,ha:"Haarfarbe",w:"Waffe",p:"Spielbar"}
```

Einfach neue Einträge in der gleichen Struktur hinzufügen – die tägliche Rotation
(`DAILY_ROTATION` in `app.js`) berücksichtigt automatisch die aktuelle Array-Länge.
