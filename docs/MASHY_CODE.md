# MASHY-V1 — jednolity wizualny kod liczb w Testowe

**Źródło:** szkic użytkownika z 13 grudnia 2025 r. pokazuje trzy kreski w jednej
ramce: górną zakrzywioną, środkową poziomą, dolną ukośną ku górze.
Przyjmujemy tę kompozycję jako znak liczby **6**. Pozostałe znaki to
**proponowany słownik V1**, ponieważ szkic nie definiuje pełnego alfabetu.

## Definicja

Każdy znak w dziesiętnym ciągu zastępuje jedno obramowane pole z **trzema
poziomami kreski**. Poziomy mogą mieć kształty: pozioma \`━\`,
zakrzywiona \`∿\`, ukośna \`╱\`. Jest to lookup (tablica symboli), bez
obliczania sum, skrótów kryptograficznych lub zmiany wartości matematycznej.

| Liczba wejściowa (opis techniczny) | Kod tekstowy Mashy | Układ od góry |
|---|---|---|
| 0 | ⟦━━━⟧ | pozioma · pozioma · pozioma |
| 1 | ⟦╱━━⟧ | ukośna · pozioma · pozioma |
| 2 | ⟦━╱━⟧ | pozioma · ukośna · pozioma |
| 3 | ⟦━━╱⟧ | pozioma · pozioma · ukośna |
| 4 | ⟦∿━━⟧ | zakrzywiona · pozioma · pozioma |
| 5 | ⟦━∿━⟧ | pozioma · zakrzywiona · pozioma |
| 6 | ⟦∿━╱⟧ | **wzorzec ze szkicu** |
| 7 | ⟦╱∿━⟧ | ukośna · zakrzywiona · pozioma |
| 8 | ⟦∿∿╱⟧ | zakrzywiona · zakrzywiona · ukośna |
| 9 | ⟦╱∿╱⟧ | ukośna · zakrzywiona · ukośna |

### Zakres wdrożenia

- \`src/core/mashyCode.ts\`: jeden kanoniczny słownik, kodowanie i dekodowanie.
- \`src/components/MashyCode.tsx\`: renderowany rzeczywisty SVG kreskowy.
- \`src/components/MashyCodePanel.tsx\`: interaktywna klawiatura Mashy bez
  widocznych klasycznych cyfr; kopiuje tekstową transliterację symboli.
- Komponenty monitorowania Debian i SPAA używają Mashy dla liczb w UI;
  dane backendu, UUID, porty i obliczenia pozostają w formatach natywnych.

Przykłady: sekwencja techniczna \`123\` zapisuje się
\`⟦╱━━⟧⟦━╱━⟧⟦━━╱⟧\`, a \`6\` jako \`⟦∿━╱⟧\`.
Dekoder czyta dokładnie obramowane trójkreskowe tokeny, poza nimi
pozostawia tekst bez zmian.

### Granice

Mashy **nie jest** nowym typem liczby w jądrze Linux, w SQLite ani w API,
nie jest również zabezpieczeniem lub hasłem. Zastąpienie liczb maszynowych
niestandardowymi znakami w protokole zepsułoby jego zgodność. W danych
przechowywany jest kanoniczny typ maszynowy, a w GUI prezentowany jest
wyłącznie kod Mashy w dostosowanych widokach. Nazwy plików, treść
surowego JSON i techniczne pola edycyjne nie są automatycznie przepisywane.
