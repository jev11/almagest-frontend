# Future Improvements

## Planetary Hours — Real-time auto-update

Currently planetary hours are calculated on page load. A `setTimeout` scheduled to fire at the next hour boundary would let the card tick over live without polling. Simple to add — just compute `nextHour.start - Date.now()` and set the timeout in a `useEffect`.

## Essential Dignities — Full Table (Triplicity, Term, Face)

The expanded planet card currently shows 4 basic dignities (domicile, exaltation, detriment, fall). A future enhancement should add the full 7-column dignity table from the SOLARFIRE_IMPROVEMENTS.md spec: Rul, Exalt, Trip, Term, Face, Detr, Fall, plus a Score column (Lilly's point system). This includes Dorothean triplicity rulers (day/night/participating), Egyptian/Ptolemaic terms (bounds), and Chaldean decans (faces). All data tables and scoring constants are already specified in SOLARFIRE_IMPROVEMENTS.md §4.
